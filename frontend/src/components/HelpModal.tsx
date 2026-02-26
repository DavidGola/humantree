import { Modal } from "./Modal";

export const HelpModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <Modal title="Bienvenue sur HumanTree" onClose={onClose} size="large">
      <div className="overflow-y-auto space-y-6 text-gray-700 dark:text-slate-300 text-sm leading-relaxed pr-2">
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Qu'est-ce que HumanTree ?
          </h3>
          <p>
            HumanTree vous permet de <strong>visualiser vos compétences</strong>{" "}
            sous forme d'arbres interactifs. Chaque arbre représente un domaine
            (programmation, musique, cuisine…) et chaque noeud une compétence à
            maîtriser. Suivez votre progression et identifiez vos prochaines
            étapes d'apprentissage en un coup d'oeil.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Comment utiliser
          </h3>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              <strong>Créer un arbre</strong> — cliquez sur "Nouvel arbre" depuis
              la page d'accueil et donnez-lui un nom.
            </li>
            <li>
              <strong>Ajouter des compétences</strong> — dans un arbre, utilisez
              le bouton "+" pour ajouter des skills et organisez-les en
              hiérarchie.
            </li>
            <li>
              <strong>Valider sa progression</strong> — cliquez sur une
              compétence pour marquer votre niveau de maîtrise.
            </li>
            <li>
              <strong>Sous-arbres</strong> — liez un arbre existant comme
              sous-arbre d'une compétence pour créer des hiérarchies profondes.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Fonctionnalités IA
          </h3>
          <p>
            Générez un arbre de compétences complet à partir d'un simple sujet,
            ou enrichissez automatiquement une compétence existante. Ces
            fonctionnalités nécessitent une{" "}
            <strong>clé API</strong> configurée dans votre profil.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Prochainement
          </h3>
          <ul className="list-disc list-inside space-y-1.5 ml-1">
            <li>
              <strong>Communautaire</strong> — partagez vos arbres, découvrez
              ceux des autres et collaborez.
            </li>
            <li>
              <strong>Gamification</strong> — badges, streaks et défis pour
              rester motivé.
            </li>
            <li>
              <strong>GPS d'apprentissage</strong> — recommandations
              personnalisées de ressources et parcours optimaux.
            </li>
          </ul>
        </section>
      </div>
    </Modal>
  );
};
