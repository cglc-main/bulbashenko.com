"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { PostsTab } from "./PostsTab";
import { ProjectsTab } from "./ProjectsTab";
import { ProfileTab } from "./ProfileTab";
import { CVTab } from "./CVTab";
import { MediaTab } from "./MediaTab";
import { SettingsTab } from "./SettingsTab";
import styles from "./AdminDashboard.module.css";

type Tab = "posts" | "projects" | "profile" | "cv" | "media" | "settings";

const TABS: [Tab, string][] = [
  ["posts",    "POSTS"],
  ["projects", "PROJECTS"],
  ["profile",  "PROFILE"],
  ["cv",       "CV"],
  ["media",    "MEDIA"],
  ["settings", "SETTINGS"],
];

export function AdminDashboard({ accountSettingsUrl }: { accountSettingsUrl: string }) {
  const [tab, setTab] = useState<Tab>("posts");

  // Ends this admin session, then sends the browser to the SSO so it signs out everywhere.
  async function logout() {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    const { redirect } = (await res.json().catch(() => ({}))) as { redirect?: string };
    window.location.assign(redirect ?? "/admin/login");
  }

  return (
    <div className={cn(styles.body, "admin-body")}>
      <div className={styles.topbar}>
        <span className={styles.logo}>BULBASHENKO.COM</span>
        <span className={styles.tag}>ADMIN PANEL</span>
      </div>
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarLabel}>ADMIN PANEL</div>
          {TABS.map(([k, l]) => (
            <button
              key={k}
              className={cn(styles.tabBtn, tab === k && styles.active)}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
          <hr className={styles.divider} />
          <Link href="/" className={styles.sidebarLink}>← BACK TO SITE</Link>
          <button className={styles.sidebarLink} onClick={logout}>LOGOUT</button>
        </div>
        <div className={styles.content}>
          {tab === "posts"    && <PostsTab />}
          {tab === "projects" && <ProjectsTab />}
          {tab === "profile"  && <ProfileTab />}
          {tab === "cv"       && <CVTab />}
          {tab === "media"    && <MediaTab />}
          {tab === "settings" && <SettingsTab accountSettingsUrl={accountSettingsUrl} />}
        </div>
      </div>
    </div>
  );
}
