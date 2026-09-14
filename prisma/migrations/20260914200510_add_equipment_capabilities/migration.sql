-- CreateTable
CREATE TABLE "EquipmentCapability" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "productClass" TEXT,
    "hardware" TEXT NOT NULL,
    "firmwareVersion" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "packageVersion" TEXT,
    "datamodel" TEXT,
    "hasPackage" BOOLEAN,
    "serialNumber" TEXT,
    "capabilities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCapability_manufacturer_modelName_hardware_firmwar_key" ON "EquipmentCapability"("manufacturer", "modelName", "hardware", "firmwareVersion");
