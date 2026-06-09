import uuid


def normalize_pair(
    id1: uuid.UUID, id2: uuid.UUID
) -> tuple[uuid.UUID, uuid.UUID]:
    return (id1, id2) if id1 < id2 else (id2, id1)
