# HumanTree

Application web permettant de visualiser et gerer son arbre de competences humaines. Le concept d'arbre permet de voir sa progression, identifier les pre-requis pour chaque competence et visualiser le chemin vers une competence visee.

## Fonctionnalites

- **Visualisation d'arbre de competences** : affichage interactif des competences et de leurs dependances sous forme de graphe oriente (layout top-down avec Dagre)
- **Validation de competences** : checkbox integree dans chaque noeud pour marquer une competence comme acquise, avec mise a jour optimiste
- **CRUD complet sur les arbres** : creation, edition, suppression et sauvegarde d'arbres de competences
- **Gestion des skills** : ajout, modification et suppression de competences au sein d'un arbre
- **Authentification** : inscription, connexion (email ou username), JWT avec stockage localStorage et restauration automatique
- **Page profil utilisateur** : vue privee (email, date d'inscription) et vue publique
- **Dark mode** : toggle integre dans la barre de navigation
- **Notifications** : toast de succes/erreur (react-hot-toast) et modals de confirmation

## Stack technique

### Backend

- **Python 3.11+**
- **FastAPI** -- framework web async
- **Pydantic v2** -- validation des donnees
- **SQLAlchemy 2.0 async** -- ORM avec asyncpg
- **PostgreSQL** -- base de donnees relationnelle
- **Alembic** -- migrations de schema
- **python-jose** -- generation et verification des JWT
- **bcrypt** -- hashage des mots de passe

### Frontend

- **React 19** + **TypeScript 5.9**
- **Vite 7** -- build tool
- **Tailwind CSS 3** -- styling utilitaire
- **React Flow (@xyflow/react)** -- rendu de graphe interactif
- **Dagre** -- layout automatique des noeuds
- **React Router 7** -- navigation SPA
- **Axios** -- client HTTP
- **react-hot-toast** -- notifications

## Structure du projet

```
backend/
  app/
    main.py                  # Point d'entree FastAPI, CORS, routers
    database.py              # Configuration SQLAlchemy async + dependency injection
    models/                  # Modeles ORM SQLAlchemy
      skill_tree.py
      skill.py
      skill_dependencies.py
      user.py
      user_check_skill.py
    schemas/                 # Schemas Pydantic (validation API)
      skill_tree.py
      skill.py
      user.py
      auth.py
    services/                # Logique metier
      skill_tree_service.py
      skill_service.py
      user_service.py
      auth_service.py
    routers/                 # Endpoints API
      skill_trees.py
      skills.py
      user.py

frontend/
  src/
    main.tsx                 # Point d'entree React
    App.tsx                  # Routes et layout principal
    api/
      client.ts              # Client Axios avec intercepteur JWT
    components/
      Navbar.tsx             # Barre de navigation (login, dark mode)
    contexts/
      AuthContext.tsx         # Gestion de l'authentification (state + provider)
      ThemeContext.tsx        # Gestion du dark mode
    pages/
      SkillTreeListPage.tsx  # Liste des arbres de competences
      SkillTreeDetailPage.tsx # Vue detail avec graphe interactif
      UserProfilePage.tsx    # Profil utilisateur
    types/
      skillTree.ts           # Types TypeScript (miroir schemas backend)
      skill.ts
      user.ts
```

## Installation et lancement

### Pre-requis

- Python 3.11+
- Node.js 20+
- PostgreSQL

### Backend

```bash
cd backend

# Creer et activer l'environnement virtuel
python -m venv venv
source venv/bin/activate

# Installer les dependances
pip install -r requirements.txt

# Configurer les variables d'environnement
# Creer un fichier .env a la racine de backend/ avec :
#   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/humantree
#   JWT_SECRET_KEY=votre_cle_secrete

# Appliquer les migrations
alembic upgrade head

# Lancer le serveur
uvicorn app.main:app --reload
```

Le backend est accessible sur `http://localhost:8000`. La documentation interactive de l'API est disponible sur `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend

# Installer les dependances
npm install

# Lancer le serveur de developpement
npm run dev
```

Le frontend est accessible sur `http://localhost:5173`.

## Screenshots

A venir.

## Licence

A definir.
