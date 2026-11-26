from fastapi import APIRouter

from app.api.v1 import clients, comptes, operations

# Les routeurs des modules (clients, comptes, opérations, statistiques)
# seront rattachés ici à mesure qu'ils sont créés, dans les phases 3.3 à 3.7.
api_router = APIRouter()
api_router.include_router(clients.router)
api_router.include_router(comptes.router)
api_router.include_router(operations.router)
