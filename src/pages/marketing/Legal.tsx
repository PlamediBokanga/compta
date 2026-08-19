export function LegalPage() {
  return (
    <div className="bg-ink-50">
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-950">
          Mentions légales
        </h1>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink-700">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Éditeur</h2>
            <p className="mt-2">
              Tenzo SAS — Société par actions simplifiée au capital de 10 000 €<br />
              Siège social : 12 rue de la Comptabilité, 75002 Paris<br />
              RCS Paris : 902 457 381<br />
              SIREN : 902 457 381 00018<br />
              N° TVA intracommunautaire : FR 56 902457381<br />
              Directeur de la publication : Jean Dupont<br />
              Contact : legal@tenzo.fr
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Hébergement</h2>
            <p className="mt-2">
              Le service est hébergé par Supabase Inc. (infrastructure AWS, région eu-west-1 / Paris)
              et OVHcloud pour les sauvegardes. Les données sont stockées en France.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Conditions générales d'utilisation</h2>
            <p className="mt-2">
              L'utilisation du service implique l'acceptation des présentes CGU. Tenzo fournit un
              outil d'aide à la comptabilité et à la facturation. L'utilisateur reste seul responsable
              de la véracité et de l'exhaustivité des informations transmises aux administrations.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Politique de confidentialité (RGPD)</h2>
            <p className="mt-2">
              Tenzo traite les données personnelles conformément au RGPD. Finalités : tenue de
              comptabilité, production de déclarations fiscales, facturation. Durée de conservation :
              10 ans (obligation légale). Droits d'accès, de rectification, d'effacement exerçables
              auprès de dpo@tenzo.fr.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Sécurité</h2>
            <p className="mt-2">
              Chiffrement en transit (TLS 1.2+), chiffrement au repos (AES-256), authentification
              multi-facteurs, audits de sécurité réguliers, sauvegardes chiffrées quotidiennes,
              plan de continuité d'activité.
            </p>
          </div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900">Médiation</h2>
            <p className="mt-2">
              En cas de litige, l'utilisateur peut recourir au médiateur de la consommation
              (MEDICYS, 73 Boulevard de Clichy, 75009 Paris).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
