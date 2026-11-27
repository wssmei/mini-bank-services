from fastapi import APIRouter

from app.api.v1 import clients, comptes, historique, operations, statistiques

# Les routeurs des modules (clients, comptes, opérations, historique, statistiques)
# sont rattachés ici à mesure qu'ils sont créés.
api_router = APIRouter()
api_router.include_router(clients.router)
api_router.include_router(comptes.router)
api_router.include_router(operations.router)
api_router.include_router(historique.router)
api_router.include_router(statistiques.router)
