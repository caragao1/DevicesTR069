-- CreateTable
CREATE TABLE "Olt" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "modelo" TEXT,
    "host" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL DEFAULT 'ssh',
    "porta" INTEGER NOT NULL DEFAULT 22,
    "usuario" TEXT NOT NULL,
    "senhaEncrypted" TEXT NOT NULL,
    "localizacao" TEXT,
    "observacoes" TEXT,
    "monitorar" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Olt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OltColeta" (
    "id" TEXT NOT NULL,
    "oltId" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "erro" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "online" INTEGER NOT NULL DEFAULT 0,
    "sinalCritico" INTEGER NOT NULL DEFAULT 0,
    "pendentes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OltColeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OltLeituraOnu" (
    "id" TEXT NOT NULL,
    "coletaId" TEXT NOT NULL,
    "pon" INTEGER NOT NULL,
    "onuId" INTEGER NOT NULL,
    "sn" TEXT NOT NULL,
    "nome" TEXT,
    "online" BOOLEAN NOT NULL,
    "ultimaQueda" TEXT,
    "rxDbm" DOUBLE PRECISION,
    "txDbm" DOUBLE PRECISION,
    "oltRxDbm" DOUBLE PRECISION,
    "temperaturaC" DOUBLE PRECISION,
    "classeSinal" TEXT,

    CONSTRAINT "OltLeituraOnu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OltOperacao" (
    "id" TEXT NOT NULL,
    "oltId" TEXT NOT NULL,
    "userId" TEXT,
    "acao" TEXT NOT NULL,
    "recurso" TEXT,
    "alvo" TEXT,
    "comandos" TEXT NOT NULL,
    "saidas" TEXT,
    "sucesso" BOOLEAN NOT NULL,
    "erro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OltOperacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Olt_nome_key" ON "Olt"("nome");

-- CreateIndex
CREATE INDEX "OltColeta_oltId_createdAt_idx" ON "OltColeta"("oltId", "createdAt");

-- CreateIndex
CREATE INDEX "OltLeituraOnu_coletaId_idx" ON "OltLeituraOnu"("coletaId");

-- CreateIndex
CREATE INDEX "OltLeituraOnu_pon_onuId_idx" ON "OltLeituraOnu"("pon", "onuId");

-- CreateIndex
CREATE INDEX "OltOperacao_oltId_createdAt_idx" ON "OltOperacao"("oltId", "createdAt");

-- AddForeignKey
ALTER TABLE "OltColeta" ADD CONSTRAINT "OltColeta_oltId_fkey" FOREIGN KEY ("oltId") REFERENCES "Olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OltLeituraOnu" ADD CONSTRAINT "OltLeituraOnu_coletaId_fkey" FOREIGN KEY ("coletaId") REFERENCES "OltColeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OltOperacao" ADD CONSTRAINT "OltOperacao_oltId_fkey" FOREIGN KEY ("oltId") REFERENCES "Olt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OltOperacao" ADD CONSTRAINT "OltOperacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

