import re

ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07")


def limpar(texto):
    """Remove códigos ANSI, backspaces (com o caractere apagado) e \\r da saída da CLI."""
    texto = ANSI.sub("", texto)
    anterior = None
    while anterior != texto:
        anterior = texto
        texto = re.sub(r"[^\x08\n]\x08", "", texto)
    return texto.replace("\x08", "").replace("\r", "")
