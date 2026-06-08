export default function PrivacyPolicyPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto font-sans text-slate-800">
      <h1 className="text-3xl font-black mb-6">Politique de Confidentialité</h1>
      <p className="mb-4">Dernière mise à jour : 8 juin 2026</p>
      
      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">1. Données collectées</h2>
        <p>Nous collectons uniquement les informations nécessaires au fonctionnement de la plateforme : identité, données de scolarité, plannings et notes.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">2. Utilisation des données</h2>
        <p>Ces données sont utilisées pour permettre le suivi pédagogique, la gestion administrative et l'accès aux outils de jeu éducatif.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-2">3. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de vos données. Vous pouvez exercer ces droits directement depuis vos paramètres de compte.</p>
      </section>
    </div>
  );
}
