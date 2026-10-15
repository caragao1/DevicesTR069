from olt_manager.drivers import textos


def classificar_sinal(rx):
    if rx is None:
        return "sem-leitura"
    if rx < textos.LIMITE_SINAL_CRITICO:
        return "critico"
    if rx < textos.LIMITE_SINAL_ALERTA:
        return "alerta"
    if rx > textos.LIMITE_SINAL_FORTE:
        return "forte"
    return "bom"


def juntar_onus_e_sinal(onus, sinais):
    por_onu = {(s["pon"], s["onu_id"]): s for s in sinais}
    resultado = []
    for onu in onus:
        s = por_onu.get((onu["pon"], onu["onu_id"]), {})
        item = dict(onu)
        for chave in ("rx_dbm", "tx_dbm", "olt_rx_dbm", "temperatura_c"):
            item[chave] = s.get(chave)
        item["classe_sinal"] = classificar_sinal(item["rx_dbm"]) if onu["online"] else "offline"
        resultado.append(item)
    return resultado


def traduzir_queda(texto):
    for chave, traducao in textos.MOTIVOS_QUEDA:
        if chave in (texto or "").lower():
            return traducao
    return texto or ""
