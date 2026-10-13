from olt_manager.drivers.demo import DriverDemo
from olt_manager.drivers.hsgq.driver import DriverHSGQ

# Para homologar um novo modelo: crie drivers/<fabricante>/driver.py com uma subclasse de DriverOLT e registre aqui.
DRIVERS = {
    "hsgq": DriverHSGQ,
    "demo": DriverDemo,
}


def obter_driver(fabricante, **conexao):
    return DRIVERS[fabricante.lower()](**conexao)


def opcoes_drivers():
    return [
        (chave, f"{cls.fabricante} — {', '.join(cls.modelos)}")
        for chave, cls in DRIVERS.items()
    ]
