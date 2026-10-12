"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Lock, Palette, Shield, Trash2, User } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { ApiError, authApi, profileApi, type UserProfileApi } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";

const SECTIONS = [{ id: "account", label: "Account", icon: User }, { id: "notifications", label: "Notifications", icon: Bell }, { id: "appearance", label: "Appearance", icon: Palette }, { id: "privacy", label: "Privacy", icon: Shield }];
const NOTIF_SETTINGS = [{ id: "daily", label: "Daily outfit suggestion", desc: "AI picks an outfit every morning", default: true }, { id: "weather", label: "Weather alerts", desc: "Styling advice based on forecast", default: true }, { id: "sale", label: "Price drop alerts", desc: "When wishlisted items go on sale", default: true }, { id: "trend", label: "Trend updates", desc: "Weekly fashion trends matched to you", default: false }, { id: "system", label: "Product updates", desc: "New features and improvements", default: false }];
const PRIVACY_SETTINGS = [{ id: "p1", label: "Share anonymised style data to improve AI", def: true }, { id: "p2", label: "Allow personalised shopping recommendations", def: true }, { id: "p3", label: "Enable usage analytics", def: false }];
const defaultNotifs = Object.fromEntries(NOTIF_SETTINGS.map((item) => [item.id, item.default]));
const defaultPrivacy = Object.fromEntries(PRIVACY_SETTINGS.map((item) => [item.id, item.def]));
const messageFor = (error: unknown) => error instanceof ApiError ? error.message : "We couldn't save your changes. Please try again.";

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, logout } = useAppStore();
  const { toast } = useToast();
  const [active, setActive] = useState("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [name, setName] = useState("");
  const [sizes, setSizes] = useState("");
  const [notifs, setNotifs] = useState<Record<string, boolean>>(defaultNotifs);
  const [privacy, setPrivacy] = useState<Record<string, boolean>>(defaultPrivacy);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const applyProfile = (next: UserProfileApi) => {
    setProfile(next);
    setName([next.profile?.firstName, next.profile?.lastName].filter(Boolean).join(" "));
    setSizes(next.profile?.clothingSizes?.general ?? "");
    setNotifs({ ...defaultNotifs, ...(next.preferences?.notificationPreferences as Record<string, boolean> ?? {}) });
    setPrivacy({ ...defaultPrivacy, ...(next.preferences?.privacyPreferences as Record<string, boolean> ?? {}) });
  };
  const reload = async () => applyProfile((await profileApi.get()).data);
  const refreshUser = async () => setUser((await authApi.me()).data.user);

  useEffect(() => {
    let mounted = true;
    profileApi.get().then((response) => mounted && applyProfile(response.data)).catch((error) => mounted && toast(messageFor(error), "error")).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [toast]);

  const saveAccount = async () => {
    const normalized = name.trim();
    if (!normalized) return toast("Enter your name before saving.", "error");
    const [firstName, ...lastName] = normalized.split(/\s+/);
    setSaving(true);
    try {
      await profileApi.updateSettings({ profile: { firstName, lastName: lastName.join(" "), clothingSizes: sizes.trim() ? { general: sizes.trim() } : {} } });
      await Promise.all([reload(), refreshUser()]);
      toast("Account details saved.", "success");
    } catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };
  const savePreferences = async (field: "notificationPreferences" | "privacyPreferences", value: Record<string, boolean>, message: string) => {
    setSaving(true);
    try { await profileApi.updatePreferences({ [field]: value }); await reload(); toast(message, "success"); }
    catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };
  const updatePassword = async () => {
    if (newPassword !== confirmPassword) return toast("The new passwords do not match.", "error");
    setSaving(true);
    try { await profileApi.changePassword(currentPassword, newPassword); logout(); toast("Password updated. Please sign in again.", "success"); router.replace("/login"); }
    catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };
  const requestEmailCode = async () => {
    setSaving(true);
    try { const result = await profileApi.requestEmailChange(newEmail, emailPassword); setNewEmail(result.data.newEmail); setEmailCodeSent(true); toast("A code was sent to your new email address.", "success"); }
    catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };
  const confirmEmail = async () => {
    setSaving(true);
    try { await profileApi.confirmEmailChange(newEmail, emailCode); logout(); toast("Email updated. Please sign in with your new address.", "success"); router.replace("/login"); }
    catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };
  const deleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return toast("Type DELETE to confirm account deletion.", "error");
    setSaving(true);
    try { await profileApi.deleteAccount(deletePassword); logout(); toast("Your account has been deleted.", "success"); router.replace("/"); }
    catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };

  return <DashboardShell heading="Settings" subheading="Manage your account, notifications, and preferences."><div className="grid gap-6 lg:grid-cols-[220px_1fr]">
    <nav className="flex flex-row gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">{SECTIONS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActive(id)} className={`flex flex-none items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm transition-colors ${active === id ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}</nav>
    <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-6">
      {active === "account" && <>
        <div><p className="text-label-sm mb-4">Personal information</p><div className="grid gap-4 sm:grid-cols-2"><Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} disabled={loading || saving} /><Input label="Email" value={profile?.email ?? user?.email ?? ""} disabled /><Input label="Sizes" value={sizes} onChange={(event) => setSizes(event.target.value)} disabled={loading || saving} /><Input label="Email status" value={profile?.emailVerified ? "Verified" : "Verification required"} disabled /></div><Button className="mt-5" onClick={saveAccount} disabled={saving || loading}>{saving ? "Saving…" : "Save changes"}</Button></div>
        <Separator />
        <div><p className="text-label-sm mb-1">Change email</p><p className="text-xs text-muted-foreground mb-4">Email changes are separate from profile editing and require your password plus a code sent to the new address.</p><div className="grid max-w-md gap-4"><Input label="New email" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} disabled={saving} /><Input label="Current password" type="password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} disabled={saving} />{emailCodeSent && <Input label="Six-digit verification code" inputMode="numeric" value={emailCode} onChange={(event) => setEmailCode(event.target.value)} disabled={saving} />}</div><Button variant="outline" className="mt-5" onClick={emailCodeSent ? confirmEmail : requestEmailCode} disabled={saving}>{saving ? "Working…" : emailCodeSent ? "Confirm new email" : "Send verification code"}</Button></div>
        <Separator />
        <div><p className="text-label-sm mb-4">Change password</p><div className="grid max-w-md gap-4"><Input type="password" label="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Input type="password" label="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><Input type="password" label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><Button variant="outline" className="mt-5 gap-2" onClick={updatePassword} disabled={saving}><Lock className="h-4 w-4" />Update password</Button></div>
        <Separator />
        <div><p className="text-label-sm mb-3">Connected accounts</p><div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3"><div><p className="text-sm font-medium">Sign-in security</p><p className="text-xs text-muted-foreground">Your current email is verified before password sign-in.</p></div><Badge variant={profile?.emailVerified ? "success" : "accent"} size="sm">{profile?.emailVerified ? "Verified" : "Pending"}</Badge></div></div>
        <Separator />
        <div><p className="text-label-sm text-destructive mb-2">Danger zone</p><p className="text-xs text-muted-foreground mb-4">Permanently delete your account and all wardrobe data. This cannot be undone.</p><div className="grid max-w-md gap-3"><Input type="password" label="Current password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /><Input label='Type "DELETE" to confirm' value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></div><Button variant="destructive" size="sm" className="mt-4 gap-2" onClick={deleteAccount} disabled={saving}><Trash2 className="h-4 w-4" />Delete account</Button></div>
      </>}
      {active === "notifications" && <div><p className="text-label-sm mb-5">Notification preferences</p><div className="space-y-0">{NOTIF_SETTINGS.map((item, index) => <div key={item.id}><div className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p></div><Switch checked={Boolean(notifs[item.id])} onCheckedChange={(value) => setNotifs((current) => ({ ...current, [item.id]: value }))} /></div>{index < NOTIF_SETTINGS.length - 1 && <Separator />}</div>)}</div><Button className="mt-6" onClick={() => savePreferences("notificationPreferences", notifs, "Notification settings saved.")} disabled={saving}>{saving ? "Saving…" : "Save notification settings"}</Button></div>}
      {active === "appearance" && <div className="space-y-6"><div><p className="text-label-sm mb-4">Theme</p><div className="flex items-center gap-4 rounded-2xl bg-muted/60 px-4 py-3"><p className="flex-1 text-sm">Toggle between light and dark mode</p><ThemeToggle /></div></div><Separator /><div><p className="text-label-sm mb-2">Language &amp; region</p><p className="text-xs text-muted-foreground">Language and region settings are not available yet. Theme changes take effect immediately on this device.</p></div></div>}
      {active === "privacy" && <div className="space-y-6"><div><p className="text-label-sm mb-4">Data &amp; privacy</p><div className="space-y-2">{PRIVACY_SETTINGS.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3"><p className="text-sm">{item.label}</p><Switch checked={Boolean(privacy[item.id])} onCheckedChange={(value) => setPrivacy((current) => ({ ...current, [item.id]: value }))} /></div>)}</div><Button className="mt-6" onClick={() => savePreferences("privacyPreferences", privacy, "Privacy settings saved.")} disabled={saving}>{saving ? "Saving…" : "Save privacy settings"}</Button></div><Separator /><div><p className="text-label-sm mb-2">Download your data</p><p className="text-xs text-muted-foreground">Data export is not available yet.</p></div></div>}
    </motion.div>
  </div></DashboardShell>;
}
