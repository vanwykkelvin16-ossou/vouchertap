import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useProfile, isMissingColumnError, type Profile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/image-uploader";
import { NotificationSettings } from "@/components/notification-settings";
import {
  LogOut,
  LayoutDashboard,
  Loader2,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Pencil,
  Share2,
  ExternalLink,
} from "lucide-react";
import { BrandHeart } from "@/components/brand-heart";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { revokeAccess } from "@/lib/access-code";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useProfile();

  // Voucher count for stat strip
  const { data: voucherCount } = useQuery({
    queryKey: ["voucher-claims-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("voucher_claims")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const [editOpen, setEditOpen] = useState(false);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const displayName = profile?.display_name || fullName || "Welcome";
  const handle = (profile?.email ?? "").split("@")[0] || "member";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-ZA", {
        month: "short",
        year: "numeric",
      })
    : null;

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  const cleanWebsite = (profile?.business_website ?? "").replace(/^https?:\/\//, "");

  return (
    <div className="mx-auto w-full max-w-2xl pb-10">
      {/* Top bar — Instagram-style with handle + actions */}
      <header className="flex items-center justify-between pb-6">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Profile</p>
          <h1 className="text-2xl font-bold tracking-tight truncate">@{handle}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator
                  .share({
                    title: "So Love Krugersdorp",
                    url: window.location.origin,
                  })
                  .catch(() => {});
              } else if (typeof navigator !== "undefined") {
                navigator.clipboard?.writeText(window.location.origin);
                toast.success("Link copied");
              }
            }}
            aria-label="Share"
          >
            <Share2 className="size-[18px]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="size-[18px]" />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Identity row — avatar + stats (Instagram) */}
          <section className="flex items-center gap-6 sm:gap-10">
            <div className="relative shrink-0">
              <div className="rounded-full p-[3px] bg-gradient-to-tr from-primary via-rose-400 to-amber-300">
                <div className="rounded-full p-[2px] bg-background">
                  <div className="size-[88px] sm:size-[104px] rounded-full overflow-hidden bg-muted grid place-items-center">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {(displayName[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <Stat value={voucherCount ?? 0} label="Vouchers" />
              <Stat value={profile?.business_name ? 1 : 0} label="Business" />
              <Stat value={memberSince ?? "—"} label="Member" small={!!memberSince} />
            </div>
          </section>

          {/* Name + bio block */}
          <section className="space-y-1">
            <h2 className="text-[15px] font-semibold leading-tight">{displayName}</h2>
            {fullName && fullName !== displayName && (
              <p className="text-[13px] text-muted-foreground leading-snug">{fullName}</p>
            )}
            <p className="text-[13px] text-muted-foreground leading-snug">{profile?.email}</p>
            {profile?.phone && (
              <p className="text-[13px] text-muted-foreground tabular-nums leading-snug">
                {profile.phone}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active member
              </span>
            </div>
          </section>

          {/* Action buttons row */}
          <section className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="h-9 font-semibold text-sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4 mr-1.5" />
              Edit profile
            </Button>
            <Button variant="secondary" className="h-9 font-semibold text-sm" asChild>
              <Link to="/app/my-vouchers">My vouchers</Link>
            </Button>
          </section>

          {/* Personal details */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle className="mb-0">Personal details</SectionTitle>
              <button
                onClick={() => setEditOpen(true)}
                className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Pencil className="size-3" /> Edit
              </button>
            </div>
            <Card className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem label="Name" value={profile?.first_name} />
              <DetailItem label="Surname" value={profile?.last_name} />
              <DetailItem label="SLK code" value={profile?.slk_code} mono />
              <DetailItem label="Personal tel" value={profile?.phone} mono />
              <DetailItem label="Work tel" value={profile?.work_phone} mono />
              <DetailItem label="Email" value={profile?.email} />
            </Card>
          </section>

          {/* Business card */}
          {profile?.business_name || profile?.business_website || profile?.business_logo_url ? (
            <section>
              <SectionTitle>Business</SectionTitle>
              <Card className="p-4 flex items-center gap-4">
                <div className="size-14 rounded-2xl overflow-hidden bg-muted shrink-0 grid place-items-center">
                  {profile?.business_logo_url ? (
                    <img
                      src={profile.business_logo_url}
                      alt={profile.business_name ?? "Business"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Globe className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] truncate">
                    {profile?.business_name || "Your business"}
                  </p>
                  {cleanWebsite && (
                    <a
                      href={
                        profile!.business_website!.startsWith("http")
                          ? profile!.business_website!
                          : `https://${profile!.business_website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-primary inline-flex items-center gap-1 mt-0.5 truncate"
                    >
                      {cleanWebsite}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  {profile?.business_email && (
                    <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                      {profile.business_email}
                    </p>
                  )}
                  {profile?.work_phone && (
                    <p className="text-[12px] text-muted-foreground tabular-nums mt-0.5">
                      {profile.work_phone}
                    </p>
                  )}
                </div>
              </Card>
            </section>
          ) : (
            <section>
              <SectionTitle>Business</SectionTitle>
              <button
                onClick={() => setEditOpen(true)}
                className="w-full rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-left hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">Add your business</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Tell the SLK community what you do.
                </p>
              </button>
            </section>
          )}

          {/* Notifications */}
          <section>
            <SectionTitle>Notifications</SectionTitle>
            <NotificationSettings />
          </section>

          {isAdmin && (
            <section>
              <SectionTitle>Admin</SectionTitle>
              <Link
                to="/admin"
                className="flex items-center justify-between -mx-3 px-3 py-3 rounded-xl hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Admin portal</p>
                    <p className="text-[12px] text-muted-foreground">Manage events & vouchers</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </section>
          )}

          <ContactSection />

          {/* About */}
          <section>
            <SectionTitle>About</SectionTitle>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              So Love Krugersdorp is a members-only experience. Your vouchers are tied to your
              account — they can't be shared, screenshotted, or used by anyone else.
            </p>
          </section>

          <div className="pt-2">
            <button
              onClick={() => {
                revokeAccess();
                navigate({ to: "/access-code" });
              }}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground py-2"
            >
              Reset access code on this device
            </button>
          </div>
        </div>
      )}

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile ?? null}
        userId={user?.id ?? ""}
        userEmail={user?.email ?? ""}
        onSaved={() => qc.invalidateQueries({ queryKey: ["profile", user?.id] })}
      />
    </div>
  );
}

function Stat({ value, label, small }: { value: number | string; label: string; small?: boolean }) {
  return (
    <div>
      <p
        className={`font-bold tracking-tight tabular-nums ${
          small ? "text-sm sm:text-base" : "text-xl"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground ${className ?? "mb-3"}`}
    >
      {children}
    </h3>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
        {label}
      </p>
      <p
        className={`text-sm font-medium mt-0.5 truncate ${mono ? "tabular-nums" : ""} ${
          value ? "text-foreground" : "text-muted-foreground/50"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  userId,
  userEmail,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile | null;
  userId: string;
  userEmail: string;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [slkCode, setSlkCode] = useState("");
  const [phone, setPhone] = useState("");
  const [workPhone, setWorkPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDisplayName(profile?.display_name ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
      setSlkCode(profile?.slk_code ?? "");
      setPhone(profile?.phone ?? "");
      setWorkPhone(profile?.work_phone ?? "");
      setBusinessName(profile?.business_name ?? "");
      setBusinessEmail(profile?.business_email ?? "");
      setBusinessWebsite(profile?.business_website ?? "");
      setBusinessLogoUrl(profile?.business_logo_url ?? null);
    }
  }, [open, profile]);

  const save = useMutation({
    mutationFn: async () => {
      const clean = (v: string) => v.trim() || null;
      const legacy = {
        display_name: clean(displayName),
        avatar_url: avatarUrl,
        first_name: clean(firstName),
        last_name: clean(lastName),
        phone: clean(phone),
        business_name: clean(businessName),
        business_website: clean(businessWebsite),
        business_logo_url: businessLogoUrl,
        updated_at: new Date().toISOString(),
      };
      const full = {
        ...legacy,
        slk_code: clean(slkCode),
        work_phone: clean(workPhone),
        business_email: clean(businessEmail),
      };
      const { error } = await supabase.from("profiles").update(full).eq("id", userId);
      if (error) {
        // Live DB missing the onboarding migration — save the legacy fields.
        if (!isMissingColumnError(error)) throw error;
        const retry = await supabase.from("profiles").update(legacy).eq("id", userId);
        if (retry.error) throw retry.error;
      }
    },
    onSuccess: () => {
      toast.success("Profile updated");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message || "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit profile</DialogTitle>
          <DialogDescription className="text-[13px]">
            Update your personal and business details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <ImageUploader
              value={avatarUrl}
              onChange={setAvatarUrl}
              folder={`avatars/${userId}`}
              shape="circle"
              label="Change photo"
            />
            <p className="text-[12px] text-muted-foreground">Profile photo</p>
          </div>

          {/* Personal */}
          <div className="space-y-4">
            <SectionTitle>Personal</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-first" className="text-[12px]">
                  Name
                </Label>
                <Input
                  id="ep-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Kelvin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-last" className="text-[12px]">
                  Surname
                </Label>
                <Input
                  id="ep-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="van Wyk"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-display" className="text-[12px]">
                Display name
              </Label>
              <Input
                id="ep-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Email</Label>
              <Input value={userEmail} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-slk" className="text-[12px]">
                SLK code
              </Label>
              <Input
                id="ep-slk"
                value={slkCode}
                onChange={(e) => setSlkCode(e.target.value)}
                placeholder="e.g. SLK-1234"
                className="font-serial uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ep-phone" className="text-[12px]">
                  Personal tel
                </Label>
                <Input
                  id="ep-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="072 123 4567"
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ep-work-phone" className="text-[12px]">
                  Work tel
                </Label>
                <Input
                  id="ep-work-phone"
                  type="tel"
                  value={workPhone}
                  onChange={(e) => setWorkPhone(e.target.value)}
                  placeholder="011 000 0000"
                  className="tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Business */}
          <div className="space-y-4">
            <SectionTitle>Business</SectionTitle>
            <div className="flex flex-col items-center gap-2">
              <ImageUploader
                value={businessLogoUrl}
                onChange={setBusinessLogoUrl}
                folder={`avatars/${userId}`}
                shape="circle"
                label="Logo"
              />
              <p className="text-[12px] text-muted-foreground">Business logo</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-biz-name" className="text-[12px]">
                Business name
              </Label>
              <Input
                id="ep-biz-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. SA Broking Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-biz-email" className="text-[12px]">
                Business email
              </Label>
              <Input
                id="ep-biz-email"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="hello@company.co.za"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ep-biz-web" className="text-[12px]">
                Website
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="ep-biz-web"
                  type="url"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  placeholder="www.yourbusiness.co.za"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="font-semibold">
            {save.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["contact-info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_info")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        general_email: string | null;
        contacts: { name: string; phone: string }[];
      } | null;
    },
  });

  if (isLoading || (!data?.general_email && !data?.contacts?.length)) return null;

  return (
    <section>
      <SectionTitle>Get in touch</SectionTitle>
      <Card className="overflow-hidden divide-y divide-border p-0">
        {data?.general_email && (
          <a
            href={`mailto:${data.general_email}`}
            className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
          >
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0 shadow-sm shadow-primary/20">
              <Mail className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Email the team
              </p>
              <p className="font-semibold text-sm mt-0.5 break-all">{data.general_email}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </a>
        )}
        {(data?.contacts ?? []).map((c, i) => (
          <a
            key={i}
            href={`tel:${c.phone.replace(/\s+/g, "")}`}
            className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
          >
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Phone className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{c.phone}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </a>
        ))}
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-muted/30">
          <BrandHeart className="size-3.5 text-primary" />
          <p className="text-[11px] text-muted-foreground">
            So Love Krugersdorp — connecting community, every day.
          </p>
        </div>
      </Card>
    </section>
  );
}
