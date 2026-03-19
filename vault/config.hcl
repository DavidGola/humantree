# Vault production configuration

# Stockage sur disque (chiffré par Vault automatiquement)
storage "file" {
  path = "/vault/file"
}

# Listener HTTP — pas de TLS car on est dans le réseau Docker interne
# En prod avec exposition externe, il FAUT du TLS
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

# Adresse que Vault annonce aux clients
api_addr = "http://vault:8200"

# Désactive le mlock warning (Docker gère la mémoire)
disable_mlock = true

# Interface UI accessible sur http://localhost:8200/ui
ui = true
