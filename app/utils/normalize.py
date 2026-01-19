def kinney_score(G, F, P):
    return int(G) * int(F) * int(P)

def classify_from_score(score: int):
    if score <= 25:
        return "Faible"
    if score <= 50:
        return "Modéré"
    return "Élevé"
