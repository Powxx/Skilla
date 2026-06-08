import PasswordChangeClient from "./password/password-client";
import GDPRSettingsClient from "./gdpr-client";

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-black">Paramètres</h1>
      <PasswordChangeClient />
      <GDPRSettingsClient />
    </div>
  );
}
