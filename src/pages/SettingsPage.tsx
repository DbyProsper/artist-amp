import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Bell,
  Mail,
  Music2,
  Info,
  LogOut,
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Shield,
  BarChart3,
  MessageSquare,
  Lock,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/context/FirebaseAuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
} from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  pushNotificationsEnabled,
  registerPushNotifications,
  unregisterPushNotifications,
} from "@/lib/callServices";

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const { isAdminOrModerator } = useUserRole();
  const navigate = useNavigate();
  const [pushNotifications, setPushNotifications] = useState(() =>
    pushNotificationsEnabled(),
  );
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [accountActionOpen, setAccountActionOpen] = useState(false);
  const [accountAction, setAccountAction] = useState<
    "deactivate" | "delete" | null
  >(null);
  const [accountConfirmation, setAccountConfirmation] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountProcessing, setAccountProcessing] = useState(false);
  const hasPasswordProvider =
    user?.providerData.some((provider) => provider.providerId === "password") ??
    false;

  const changePushNotifications = async (enabled: boolean) => {
    try {
      if (enabled) {
        await registerPushNotifications();
        setPushNotifications(true);
        toast.success("Incoming-call notifications enabled on this device.");
      } else {
        await unregisterPushNotifications();
        setPushNotifications(false);
        toast.success("Incoming-call notifications disabled on this device.");
      }
    } catch (error) {
      setPushNotifications(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Incoming-call notifications could not be enabled.",
      );
    }
  };

  const handlePasswordSave = async () => {
    if (!user?.email) return;
    if (newPassword.length < 8)
      return void toast.error("Use at least 8 characters.");
    if (newPassword !== confirmPassword)
      return void toast.error("New passwords do not match.");
    setPasswordSaving(true);
    try {
      if (hasPasswordProvider) {
        if (!currentPassword) throw new Error("Enter your current password.");
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, currentPassword),
        );
        await updatePassword(user, newPassword);
      } else {
        await linkWithCredential(
          user,
          EmailAuthProvider.credential(user.email, newPassword),
        );
      }
      toast.success(
        hasPasswordProvider ? "Password updated." : "Password sign-in enabled.",
      );
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace("Firebase: ", "")
          : "Unable to update password.";
      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    const checkPendingRequest = async () => {
      try {
        const requestsQuery = query(
          collection(db, "verification_requests"),
          where("profile_id", "==", profile.id),
          where("status", "==", "pending"),
        );
        const querySnapshot = await getDocs(requestsQuery);
        setPendingRequest(!querySnapshot.empty);
      } catch (error) {
        console.error("Error checking pending request:", error);
      }
    };
    void checkPendingRequest();
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/landing", { replace: true });
  };

  const handleVerificationRequest = async () => {
    if (!profile) return;

    if (pendingRequest) {
      toast.info("You already have a pending verification request");
      return;
    }

    try {
      await addDoc(collection(db, "verification_requests"), {
        profile_id: profile.id,
        reason: "Artist verification request submitted via Settings",
        status: "pending",
        created_at: new Date(),
      });

      setPendingRequest(true);
      toast.success(
        "Verification request submitted! We'll review your profile and get back to you.",
      );
    } catch (err) {
      console.error("Error submitting request:", err);
      toast.error("Failed to submit verification request");
    }
  };

  const closeAccountAction = () => {
    if (accountProcessing) return;
    setAccountActionOpen(false);
    setAccountAction(null);
    setAccountConfirmation("");
    setAccountPassword("");
  };

  const handleAccountAction = async () => {
    if (!user || !accountAction) return;
    if (
      accountAction === "delete" &&
      accountConfirmation.trim().toUpperCase() !== "DELETE"
    ) {
      toast.error("Type DELETE to confirm permanent account deletion.");
      return;
    }
    setAccountProcessing(true);
    try {
      if (accountAction === "deactivate") {
        await updateDoc(doc(db, "profiles", user.uid), {
          account_status: "deactivated",
          is_deactivated: true,
          deactivated_at: serverTimestamp(),
        });
        await signOut();
        toast.success(
          "Your account has been deactivated. Sign in again whenever you want to reactivate it.",
        );
        navigate("/landing", { replace: true });
        return;
      }

      if (hasPasswordProvider) {
        if (!user.email || !accountPassword)
          throw new Error("Enter your current password to continue.");
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, accountPassword),
        );
      } else if (
        user.providerData.some(
          (provider) => provider.providerId === "google.com",
        )
      ) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        throw new Error(
          "Please sign out, sign in again, and retry account deletion.",
        );
      }

      await updateDoc(doc(db, "profiles", user.uid), {
        account_status: "deleted",
        is_deactivated: false,
        deleted_at: serverTimestamp(),
        name: "Deleted account",
        username: `deleted-${user.uid.slice(0, 8)}`,
        email: "",
        bio: null,
        avatar_url: null,
        cover_url: null,
        location: null,
        genres: [],
        is_artist: false,
        is_verified: false,
      });
      await Promise.allSettled([
        deleteDoc(doc(db, "users", user.uid)),
        deleteDoc(doc(db, "user_preferences", user.uid)),
        deleteDoc(doc(db, "social_links", user.uid)),
        deleteDoc(doc(db, "studio_states", user.uid)),
        deleteDoc(doc(db, "studio_sessions", user.uid)),
      ]);
      await deleteUser(user);
      sessionStorage.removeItem("musicinsta_identity");
      localStorage.removeItem("musicinsta_active_daw_project");
      toast.success("Your account has been permanently deleted.");
      navigate("/landing", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace("Firebase: ", "")
          : "The account action could not be completed.";
      toast.error(message);
    } finally {
      setAccountProcessing(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  const settingsSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Edit Profile",
          description: "Update your profile information",
          onClick: () => navigate("/settings/edit-profile"),
        },
        {
          icon: Lock,
          label: hasPasswordProvider ? "Change Password" : "Set a Password",
          description: hasPasswordProvider
            ? "Update your sign-in password"
            : "Also sign in with email and password",
          onClick: () => setPasswordOpen(true),
        },
        {
          icon: UserX,
          label: "Deactivate or Delete Account",
          description: "Temporarily pause or permanently remove your account",
          onClick: () => setAccountActionOpen(true),
        },
        ...(profile?.is_artist
          ? [
              {
                icon: BarChart3,
                label: "Analytics",
                description: "View your performance metrics",
                onClick: () => navigate("/analytics"),
              },
            ]
          : []),
        ...(profile?.is_artist && !profile?.is_verified
          ? [
              {
                icon: BadgeCheck,
                label: pendingRequest
                  ? "Verification Pending"
                  : "Request Verification",
                description: pendingRequest
                  ? "Your request is being reviewed"
                  : "Get verified as an artist",
                onClick: handleVerificationRequest,
                disabled: pendingRequest,
              },
            ]
          : []),
        ...(isAdminOrModerator
          ? [
              {
                icon: Shield,
                label: "Admin Panel",
                description: "Manage users and verification requests",
                onClick: () => navigate("/admin"),
              },
            ]
          : []),
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          icon: Bell,
          label: "Push Notifications",
          description: "Receive push notifications",
          toggle: true,
          value: pushNotifications,
          onChange: changePushNotifications,
        },
        {
          icon: Mail,
          label: "Email Notifications",
          description: "Receive email updates",
          toggle: true,
          value: emailNotifications,
          onChange: setEmailNotifications,
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Music2,
          label: "Favorite Genres",
          description: "Update your music preferences",
          onClick: () => navigate("/settings/preferences"),
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: MessageSquare,
          label: "Contact Admin",
          description: "Get help or report issues",
          onClick: () => navigate("/messages?contact=admin"),
        },
        {
          icon: Mail,
          label: "Email Support",
          description: "mthabisisebata113@gmail.com",
          onClick: () => {
            window.location.href =
              "mailto:mthabisisebata113@gmail.com?subject=MusicInsta%20Support";
          },
        },
        {
          icon: Info,
          label: "About MusicInsta",
          description: "Version 1.0.0",
          onClick: () => navigate("/about"),
        },
        {
          icon: Shield,
          label: "Privacy Policy",
          description: "Read our privacy policy",
          onClick: () => navigate("/privacy"),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-36">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <BackButton />
          <h1 className="font-display font-bold text-lg">Settings</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Profile Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden gradient-border">
            <img
              src={profile?.avatar_url || "/musicinsta-default-cover.webp"}
              alt={profile?.name || "User"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold">
                {profile?.name || "User"}
              </h2>
              {profile?.is_verified && (
                <BadgeCheck
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                />
              )}
              {isAdminOrModerator && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              @{profile?.username || "user"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings/edit-profile")}
          >
            Edit
          </Button>
        </motion.div>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
              {section.title}
            </h3>
            <div className="rounded-xl bg-muted/30 overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.toggle ? undefined : item.onClick}
                  disabled={"disabled" in item && Boolean(item.disabled)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={item.value}
                      onCheckedChange={item.onChange}
                    />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </motion.div>
      </div>
      {passwordOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={(event) =>
            event.target === event.currentTarget && setPasswordOpen(false)
          }
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {hasPasswordProvider ? "Change password" : "Set a password"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {hasPasswordProvider
                    ? "Confirm your current password, then choose a new one."
                    : "Your Google sign-in will keep working. This adds email and password sign-in."}
                </p>
              </div>
              <button
                aria-label="Close"
                onClick={() => setPasswordOpen(false)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              {hasPasswordProvider && (
                <div>
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    className="mt-2"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  className="mt-2"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  className="mt-2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={passwordSaving}
                onClick={handlePasswordSave}
              >
                {passwordSaving
                  ? "Saving…"
                  : hasPasswordProvider
                    ? "Update password"
                    : "Set password"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {accountActionOpen && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/75 p-4"
          onClick={(event) =>
            event.target === event.currentTarget && closeAccountAction()
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-action-title"
            className="my-6 w-full max-w-lg rounded-2xl border border-border bg-background p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="account-action-title" className="text-xl font-bold">
                  Manage your account
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose whether to take a break or permanently delete your
                  personal MusicInsta account.
                </p>
              </div>
              <button
                aria-label="Close"
                disabled={accountProcessing}
                onClick={closeAccountAction}
                className="rounded-full p-2 hover:bg-muted disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {!accountAction ? (
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setAccountAction("deactivate")}
                  className="flex w-full items-start gap-3 rounded-xl border border-border p-4 text-left transition hover:border-primary"
                >
                  <UserX className="mt-0.5 h-5 w-5 text-primary" />
                  <span>
                    <span className="block font-semibold">
                      Deactivate account
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Your account is paused and you are signed out. Your
                      profile, music and posts are retained. Signing in again
                      reactivates it.
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => setAccountAction("delete")}
                  className="flex w-full items-start gap-3 rounded-xl border border-destructive/40 p-4 text-left transition hover:bg-destructive/5"
                >
                  <Trash2 className="mt-0.5 h-5 w-5 text-destructive" />
                  <span>
                    <span className="block font-semibold text-destructive">
                      Permanently delete account
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      Your sign-in account and identifying profile details are
                      removed. This cannot be undone.
                    </span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div
                  className={`rounded-xl border p-4 ${accountAction === "delete" ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}
                >
                  <div className="flex gap-3">
                    <AlertTriangle
                      className={`mt-0.5 h-5 w-5 shrink-0 ${accountAction === "delete" ? "text-destructive" : "text-primary"}`}
                    />
                    <div>
                      <p className="font-semibold">
                        Are you sure you want to {accountAction} your account?
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {accountAction === "delete"
                          ? "Deletion is permanent. Content already shared with other people may remain in anonymised form where needed for conversations, legal obligations, safety or platform integrity."
                          : "You will be signed out immediately. You can restore the account simply by signing in again."}
                      </p>
                    </div>
                  </div>
                </div>
                {accountAction === "delete" && (
                  <>
                    <div>
                      <Label htmlFor="delete-confirmation">
                        Type DELETE to confirm
                      </Label>
                      <Input
                        id="delete-confirmation"
                        className="mt-2"
                        autoComplete="off"
                        value={accountConfirmation}
                        onChange={(event) =>
                          setAccountConfirmation(event.target.value)
                        }
                        placeholder="DELETE"
                      />
                    </div>
                    {hasPasswordProvider && (
                      <div>
                        <Label htmlFor="delete-password">
                          Current password
                        </Label>
                        <Input
                          id="delete-password"
                          className="mt-2"
                          type="password"
                          autoComplete="current-password"
                          value={accountPassword}
                          onChange={(event) =>
                            setAccountPassword(event.target.value)
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    disabled={accountProcessing}
                    onClick={() => {
                      setAccountAction(null);
                      setAccountConfirmation("");
                      setAccountPassword("");
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    variant={
                      accountAction === "delete" ? "destructive" : "default"
                    }
                    disabled={
                      accountProcessing ||
                      (accountAction === "delete" &&
                        accountConfirmation.trim().toUpperCase() !== "DELETE")
                    }
                    onClick={() => void handleAccountAction()}
                  >
                    {accountProcessing
                      ? "Please wait…"
                      : accountAction === "delete"
                        ? "Permanently delete account"
                        : "Deactivate account"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
