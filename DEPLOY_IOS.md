# Deploy iOS — D5 Coaching
## Bundle ID : com.dayekaba.d5coaching | Team : PH4CLA89XR

Tout le pipeline est en place. Il reste **3 actions manuelles** :
Chacune prend 2-5 minutes. Ensuite tout est automatique.

---

## ETAPE 1 — Cle API App Store Connect

1. Va sur https://appstoreconnect.apple.com/access/integrations/api
2. Clique `+` → Nom : `GitHub Actions` → Role : `App Manager`
3. Note le **Key ID** (ex: `ABC123DEF4`) et **Issuer ID** (ex: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
4. Telecharge le fichier `.p8` (UNE SEULE FOIS — pas de re-telechargement possible)
5. Encode en base64 :
```bash
base64 -i AuthKey_XXXX.p8 | tr -d '\n'
```
Garde le resultat : c'est ton `ASC_KEY_CONTENT`.

---

## ETAPE 2 — Repo d5-certs + Token GitHub

### Creer le repo d5-certs
1. Va sur https://github.com/new
2. Repository name : `d5-certs`
3. Visibility : **Private** ✅
4. Initialize with README : ✅
5. Create repository

### Creer un Personal Access Token
1. Va sur https://github.com/settings/tokens/new
2. Note : `Fastlane Match d5-certs`
3. Expiration : `No expiration`
4. Scopes : coche uniquement **`repo`** ✅
5. Generate token — copie le resultat (commence par `ghp_...`)

---

## ETAPE 3 — Secrets GitHub Actions

Va sur : https://github.com/swayzee5/D5-Clients-App/settings/secrets/actions

Ajoute ces 5 secrets (bouton `New repository secret`) :

| Nom du secret    | Valeur                                          |
|------------------|-------------------------------------------------|
| `GH_PAT`         | Le token `ghp_...` de l'etape 2                 |
| `MATCH_PASSWORD` | Un mot de passe de ton choix (ex: `D5Build2025!`) |
| `ASC_KEY_ID`     | Key ID de l'etape 1 (ex: `ABC123DEF4`)          |
| `ASC_ISSUER_ID`  | Issuer ID de l'etape 1                          |
| `ASC_KEY_CONTENT`| Le base64 du `.p8` de l'etape 1                 |

---

## ETAPE 4 — Initialiser les certificats (une seule fois)

1. Va sur : https://github.com/swayzee5/D5-Clients-App/actions/workflows/ios-init.yml
2. Clique **Run workflow** → **Run**
3. Attends ~5 min

Ce workflow cree le certificat de distribution iOS et le profil de provisionnement,
puis les stocke chiffres dans `swayzee5/d5-certs`.

---

## ETAPE 5 — Lancer le build (et tous les suivants)

1. Va sur : https://github.com/swayzee5/D5-Clients-App/actions/workflows/ios-build.yml
2. Clique **Run workflow** → **Run**
3. Attends ~20 min

Le build apparait dans App Store Connect → TestFlight.
Tu peux ensuite l'associer a ta version 1.0 et soumettre a la review Apple.

---

## Pour les prochains builds

Il suffit de pousser sur `main` — le build se declenche automatiquement.
Ou de relancer le workflow `ios-build.yml` manuellement.
