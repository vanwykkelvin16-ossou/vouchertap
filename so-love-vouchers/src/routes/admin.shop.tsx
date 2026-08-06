import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminModal,
  ModalBody,
  FormSection,
  Field,
  FieldRow,
  ToggleRow,
  ModalFooter,
  ConfirmDialog,
  TagInput,
} from "@/components/admin/form-kit";
import { Plus, Pencil, Trash2, Loader2, ShoppingBag, Shirt } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";

export const Route = createFileRoute("/admin/shop")({
  component: AdminShop,
});

type ProductRow = {
  id?: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  images: string[];
  colors: string[];
  sizes: string[];
  is_active: boolean;
  sort_order: number;
};

type EditState = Omit<ProductRow, "colors" | "sizes" | "price" | "images"> & {
  colorsText: string;
  sizesText: string;
  priceText: string;
  images: (string | null)[];
};

const CATEGORIES = [
  { value: "golfer", label: "Golfer shirt" },
  { value: "cap", label: "Cap" },
  { value: "hoodie", label: "Hoodie" },
  { value: "other", label: "Other" },
];

const SIZE_PRESETS: Record<string, string> = {
  golfer: "S, M, L, XL, XXL, 3XL",
  hoodie: "S, M, L, XL, XXL, 3XL",
  cap: "One Size",
};

/** One-tap additions in the chip fields — plain shortcuts, nothing enforced. */
const COLOUR_SUGGESTIONS = ["Black", "White", "Navy", "Grey", "Red"];
const SIZE_SUGGESTIONS = ["S", "M", "L", "XL", "XXL", "3XL", "One Size"];

function parseList(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const blank: EditState = {
  name: "",
  description: "",
  category: "golfer",
  priceText: "",
  image_url: null,
  images: [null, null, null],
  colorsText: "Black, White, Red",
  sizesText: SIZE_PRESETS.golfer,
  is_active: true,
  sort_order: 0,
};

function AdminShop() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<(ProductRow & { id: string }) | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-shop"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (ProductRow & { id: string })[];
    },
  });

  const save = useMutation({
    mutationFn: async (e: EditState) => {
      if (!e.name.trim()) throw new Error("Name is required");
      const price = parseFloat(e.priceText.replace(",", "."));
      if (e.priceText.trim() === "" || isNaN(price) || price < 0)
        throw new Error("Enter a valid price");
      const colors = parseList(e.colorsText);
      // Keep images index-aligned with colours (""  = no photo for that colour)
      // so the shop can map colours[i] ↔ images[i]. When there are no colours,
      // just store the non-empty photos.
      let images: string[];
      if (colors.length > 0) {
        images = colors.map((_, i) => e.images[i] ?? "");
        while (images.length && images[images.length - 1] === "") images.pop();
      } else {
        images = e.images.filter((u): u is string => !!u);
      }
      const cover = images.find((u) => !!u) ?? null;
      const payload = {
        name: e.name.trim(),
        description: e.description || null,
        category: e.category,
        price,
        images,
        image_url: cover,
        colors,
        sizes: parseList(e.sizesText),
        is_active: e.is_active,
        sort_order: Number(e.sort_order) || 0,
      };
      if (e.id) {
        const { error } = await supabase.from("shop_products").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shop_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(edit?.id ? "Product updated" : "Product published");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-shop"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shop_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["admin-shop"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(p?: ProductRow & { id: string }) {
    if (!p) return setEdit({ ...blank });
    const imgs = (p.images?.length ? p.images : p.image_url ? [p.image_url] : []) as string[];
    setEdit({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      priceText: String(p.price ?? ""),
      image_url: p.image_url,
      // Keep the full aligned array so each colour keeps its own photo.
      images: imgs.length ? imgs.map((u) => u || null) : [null, null, null],
      colorsText: p.colors.join(", "),
      sizesText: p.sizes.join(", "),
      is_active: p.is_active,
      sort_order: p.sort_order,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage SLK merch - pricing, colours, sizes and stock visibility.
          </p>
        </div>
        <Button onClick={() => openEdit()} className="gap-2 shrink-0 rounded-full px-5 shadow-sm">
          <Plus className="size-4" /> New product
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <Card className="p-10 text-center border-dashed bg-muted/25 rounded-2xl">
          <div className="size-12 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
            <ShoppingBag className="size-6" />
          </div>
          <p className="font-semibold">No products yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add your first golfer, cap or hoodie to open the shop.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {data.map((p) => (
            <li key={p.id}>
              <Card className="p-3.5 flex items-center gap-4 rounded-2xl border-border/70 shadow-sm transition-all hover:border-border hover:shadow-md">
                <div className="size-16 rounded-xl bg-muted overflow-hidden shrink-0 grid place-items-center ring-1 ring-border/50">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="size-full object-contain p-1" />
                  ) : (
                    <Shirt className="size-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold truncate">{p.name}</p>
                    <Badge variant="outline" className="text-[10px] rounded-full uppercase">
                      {p.category}
                    </Badge>
                    {!p.is_active && (
                      <Badge variant="secondary" className="text-[10px] rounded-full">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    <span className="font-serial font-bold text-primary">
                      R {Number(p.price).toFixed(0)}
                    </span>
                    {p.colors.length > 0 && <> · {p.colors.length} colours</>}
                    {p.sizes.length > 0 && <> · {p.sizes.join(" / ")}</>}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Delete ${p.name}`}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AdminModal
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        eyebrow="Shop"
        icon={ShoppingBag}
        title={edit?.id ? "Edit product" : "New product"}
        description="Live in the member shop as soon as you publish."
        footer={
          <ModalFooter
            hint={
              edit?.id
                ? "Saving updates the live shop instantly."
                : "Publishing puts it in the shop right away."
            }
            onCancel={() => setEdit(null)}
            onSave={() => edit && save.mutate(edit)}
            saving={save.isPending}
            saveLabel={edit?.id ? "Save changes" : "Publish product"}
          />
        }
      >
        {edit && (
          <ModalBody>
            <FormSection title="Details">
              <FieldRow>
                <Field label="Name" required>
                  <Input
                    placeholder="e.g. SLK Classic Golfer"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </Field>
                <Field label="Category">
                  <Select
                    value={edit.category}
                    onValueChange={(v) =>
                      setEdit({
                        ...edit,
                        category: v,
                        sizesText:
                          edit.sizesText === "" ||
                          Object.values(SIZE_PRESETS).includes(edit.sizesText)
                            ? (SIZE_PRESETS[v] ?? edit.sizesText)
                            : edit.sizesText,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldRow>
              <Field label="Description">
                <Textarea
                  rows={3}
                  placeholder="Fabric, fit, embroidery details..."
                  value={edit.description ?? ""}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Pricing &amp; options"
              description="Colours and sizes become the choices a member picks when ordering."
            >
              <FieldRow>
                <Field label="Price" required>
                  <div className="slk-fieldbox">
                    <span className="text-sm font-semibold text-muted-foreground select-none">
                      R
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="350"
                      className="slk-bare font-serial text-sm"
                      value={edit.priceText}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.,]/g, "");
                        setEdit({ ...edit, priceText: v });
                      }}
                    />
                  </div>
                </Field>
                <Field label="Display order" hint="Lower numbers show first in the shop.">
                  <Input
                    type="number"
                    min={0}
                    value={edit.sort_order}
                    onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })}
                  />
                </Field>
              </FieldRow>

              <Field
                label="Colours"
                hint="Type a colour and press Enter. Each one gets its own photo below."
              >
                <TagInput
                  value={edit.colorsText}
                  onChange={(v) => setEdit({ ...edit, colorsText: v })}
                  placeholder="Black, White, Red…"
                  suggestions={COLOUR_SUGGESTIONS}
                />
              </Field>

              <Field label="Sizes" hint="Type a size and press Enter.">
                <TagInput
                  value={edit.sizesText}
                  onChange={(v) => setEdit({ ...edit, sizesText: v })}
                  placeholder="S, M, L, XL…"
                  suggestions={SIZE_SUGGESTIONS}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Photos"
              description={
                parseList(edit.colorsText).length > 0
                  ? "One photo per colour — the shop swaps to it when a member picks that colour. The first photo is the cover."
                  : "Up to three photos. The first one is the cover shown in the shop grid."
              }
            >
              {(() => {
                const colorList = parseList(edit.colorsText);
                const setImageAt = (i: number, url: string | null) => {
                  const next = [...edit.images];
                  while (next.length <= i) next.push(null);
                  next[i] = url;
                  setEdit({ ...edit, images: next });
                };
                const slots =
                  colorList.length > 0
                    ? colorList.map((c, i) => ({ key: `${c}-${i}`, index: i, caption: c }))
                    : [0, 1, 2].map((i) => ({
                        key: `slot-${i}`,
                        index: i,
                        caption: i === 0 ? "Cover" : `Photo ${i + 1}`,
                      }));
                const coverIndex = slots.findIndex((s) => !!edit.images[s.index]);

                return (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {slots.map((s, idx) => (
                      <div key={s.key} className="space-y-2">
                        <ImageUploader
                          value={edit.images[s.index] ?? null}
                          onChange={(url) => setImageAt(s.index, url)}
                          folder="shop"
                          aspect="4 / 5"
                          label="Add photo"
                        />
                        <div className="flex items-center justify-center gap-1.5">
                          <p className="truncate text-[11px] font-medium" title={s.caption}>
                            {s.caption}
                          </p>
                          {coverIndex === idx && (
                            <Badge
                              variant="secondary"
                              className="rounded-full px-1.5 py-0 text-[9px] uppercase tracking-wider"
                            >
                              Cover
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </FormSection>

            <FormSection title="Visibility">
              <ToggleRow label="Active" description="Visible in the member shop.">
                <Switch
                  id="shop-active"
                  checked={edit.is_active}
                  onCheckedChange={(v) => setEdit({ ...edit, is_active: v })}
                />
              </ToggleRow>
            </FormSection>
          </ModalBody>
        )}
      </AdminModal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        icon={Trash2}
        title="Delete this product?"
        description={
          <>
            <span className="font-medium text-foreground">{deleting?.name}</span> will be removed
            from the member shop immediately. This can't be undone.
          </>
        }
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        confirmLabel="Delete product"
      />
    </div>
  );
}
