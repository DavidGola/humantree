from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError


def parse_integrity_error(
    e: IntegrityError,
    *,
    duplicate_detail: str = "Conflit : une ressource avec ces données existe déjà",
    fk_detail: str = "Référence invalide : la ressource liée n'existe pas",
    check_detail: str = "Contrainte de validation violée",
    fallback_detail: str = "Erreur d'intégrité des données",
) -> HTTPException:
    error_msg = str(e.orig).lower() if e.orig else str(e).lower()

    if "unique" in error_msg or "duplicate" in error_msg:
        return HTTPException(status_code=409, detail=duplicate_detail)
    if "foreign key" in error_msg or "fk_" in error_msg or "is not present in table" in error_msg:
        return HTTPException(status_code=400, detail=fk_detail)
    if "check" in error_msg:
        return HTTPException(status_code=400, detail=check_detail)

    return HTTPException(status_code=400, detail=fallback_detail)
