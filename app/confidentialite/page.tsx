import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Skilla",
  description: "Comment Skilla collecte, utilise et protège vos données personnelles.",
};

const CONTACT_EMAIL = "contact@ecm-academie.com";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-800">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-xs text-slate-500">Dernière mise à jour : novembre 2026</p>

        <section className="mt-8 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Qui sommes-nous ?</h2>
          <p className="text-sm leading-relaxed">
            Skilla est la plateforme de gestion d&apos;emploi du temps et de suivi pédagogique de
            l&apos;ECM Académie (alternance). L&apos;ECM Académie est responsable du traitement des
            données collectées via l&apos;application.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Données collectées</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Identité : nom, prénom, identifiant, adresse e-mail, téléphone (selon le profil).</li>
            <li>Données pédagogiques : emploi du temps, notes, devoirs, absences, retards, livret d&apos;alternance.</li>
            <li>Messages échangés via la messagerie interne.</li>
            <li>Données techniques : journaux de connexion, jeton de notification si vous les activez.</li>
          </ul>
          <p className="text-sm leading-relaxed">
            Les comptes sont créés par l&apos;administration de l&apos;établissement. Aucune donnée
            n&apos;est collectée à des fins publicitaires et aucun traceur publicitaire n&apos;est utilisé.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Finalités</h2>
          <p className="text-sm leading-relaxed">
            Organisation des cours, suivi de la scolarité et de l&apos;alternance, communication entre
            élèves, enseignants, tuteurs en entreprise, responsables légaux et administration,
            sécurité des comptes.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Partage et hébergement</h2>
          <p className="text-sm leading-relaxed">
            Les données ne sont ni vendues ni cédées à des tiers. Elles sont hébergées chez nos
            sous-traitants techniques (hébergement web et base de données) au sein de l&apos;Union
            européenne lorsque cela est possible, et accessibles uniquement aux personnes habilitées
            selon leur rôle.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Durée de conservation</h2>
          <p className="text-sm leading-relaxed">
            Les données sont conservées pendant la durée de la scolarité puis archivées ou supprimées
            conformément aux obligations légales applicables aux organismes de formation.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">6. Vos droits</h2>
          <p className="text-sm leading-relaxed">
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation et d&apos;opposition. Pour les mineurs, ces droits sont
            exercés par leur responsable légal. Pour demander l&apos;accès ou la suppression de votre
            compte et de vos données, écrivez à{" "}
            <a className="font-semibold text-sky-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            . Vous pouvez également saisir la CNIL (www.cnil.fr).
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">7. Sécurité</h2>
          <p className="text-sm leading-relaxed">
            Les échanges sont chiffrés (HTTPS), les mots de passe sont stockés sous forme hachée et
            les sessions expirent après une période d&apos;inactivité.
          </p>
        </section>

        <section className="mt-6 space-y-2">
          <h2 className="text-lg font-bold text-slate-900">8. Contact</h2>
          <p className="text-sm leading-relaxed">
            Pour toute question :{" "}
            <a className="font-semibold text-sky-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Retour à la connexion
          </Link>
        </div>
      </article>
    </main>
  );
}
