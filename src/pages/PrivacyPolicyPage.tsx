import { BackButton } from "@/components/ui/BackButton";

const sections = [
  [
    "Information we collect",
    "We collect account details such as your name, username, email address, profile image, artist information and genre preferences. When you use MusicInsta, we also process content you upload or create, messages, comments, reactions, follows, playlists, listening activity, generation history, device information and basic technical logs needed to operate and secure the service.",
  ],
  [
    "How we use information",
    "We use this information to provide accounts, publish and play music, enable social features, personalise feeds and recommendations, operate MusicInsta AI Studio, measure performance, prevent abuse, troubleshoot problems and improve tools for independent artists. Listening, genre, like and play signals help rank relevant music; they are not used to remove access to other genres.",
  ],
  [
    "AI Studio and generated content",
    "Prompts and uploaded media submitted to an AI tool may be sent to the service providers required to generate, enhance or separate content. Generated outputs and related technical records may be stored in your library or profile when you choose to save or publish them. Do not submit confidential material or media you do not have permission to use.",
  ],
  [
    "Messages and calls",
    "Messages are stored so participants can access their conversations. Voice and video calls use browser-based real-time communication: call signalling and status records are processed to connect participants, while MusicInsta does not intentionally record the audio or video stream. Your network address may be exposed to the other participant through standard real-time communication technology.",
  ],
  [
    "Posts, stories and audience controls",
    "Public posts, profiles and music can be seen by other users and, where guest access is available, by people without an account. Audience exclusions let you hide a post or story from selected profiles. Excluding someone from a post does not remove the underlying track from MusicInsta’s searchable music catalogue. Stories normally expire after 24 hours.",
  ],
  [
    "Sharing and service providers",
    "We share information only as needed with hosting, storage, authentication, analytics, content-processing and AI providers that help operate MusicInsta; when required by law or to protect users and the service; or when you intentionally share content. MusicInsta does not sell personal information. External links and shares are governed by the receiving service’s policy.",
  ],
  [
    "Data retention and security",
    "We keep information for as long as it is needed to provide the service, comply with legal obligations, resolve disputes and protect the platform. You may delete eligible posts, messages and account content through available controls. Deactivated accounts remain stored so they can be restored. We use reasonable technical and organisational safeguards, but no online system can guarantee absolute security.",
  ],
  [
    "Account deactivation and deletion",
    "You can deactivate or permanently delete your account from Settings. Deactivation signs you out and pauses the account while retaining its profile and content; deliberately signing in again reactivates it. Permanent deletion requires fresh authentication, removes the sign-in account and replaces identifying profile information with an anonymous deleted-account record. Content already shared with other people may remain in anonymised form where needed to preserve conversations, meet legal obligations, prevent abuse or maintain platform integrity. Delete individual posts or tracks before deleting the account if you do not want those items to remain available.",
  ],
  [
    "Your choices and rights",
    "You can update profile information and preferences, control selected post and story audiences, edit or delete supported content, deactivate or delete your account, and manage interactions in the app. Depending on applicable law, you may ask to access, correct, export or delete personal information, or object to certain processing. Some records may be retained where legally required or necessary for safety and integrity.",
  ],
  [
    "Children",
    "MusicInsta is not directed to children under the minimum age required to consent to online services in their country. If you believe a child has provided personal information without appropriate consent, contact the MusicInsta administrator.",
  ],
  [
    "Changes and contact",
    "We may update this policy as the platform develops. Material changes will be communicated in the app where practical. Questions, privacy requests or complaints can be sent through the in-app Messages support option or by email using the contact option below.",
  ],
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
        <BackButton />
        <h1 className="font-display text-lg font-bold">Privacy Policy</h1>
      </header>
      <article className="mx-auto max-w-3xl space-y-7 px-5 py-8">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6">
          <img
            src="/musicinsta-legacy-logo-transparent-v2.png"
            alt="MusicInsta"
            className="mb-5 h-28 w-auto object-contain sm:h-32"
          />
          <p className="text-sm font-semibold text-primary">MusicInsta</p>
          <h2 className="mt-2 text-3xl font-bold">
            Your music. Your audience. Your privacy.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This policy explains how MusicInsta handles information when
            artists, fans and industry professionals use the social platform,
            music player, messaging, calls and AI Studio.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Effective: 7 November 2026
          </p>
        </div>
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
          </section>
        ))}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-xl font-bold">Secondary privacy contact</h2>
          <p className="mt-2 leading-7 text-muted-foreground">
            If in-app support is unavailable, email{" "}
            <a
              className="font-medium text-primary underline underline-offset-4"
              href="mailto:mthabisisebata113@gmail.com?subject=MusicInsta%20Privacy%20Request"
            >
              mthabisisebata113@gmail.com
            </a>
            . Include “MusicInsta Privacy Request” in the subject and do not
            send your password.
          </p>
        </section>
      </article>
    </main>
  );
}
