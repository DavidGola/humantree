# Policy pour le backend HumanTree
# Lecture seule sur les secrets de l'application

path "secret/data/humantree/*" {
  capabilities = ["read"]
}

path "secret/metadata/humantree/*" {
  capabilities = ["list"]
}
