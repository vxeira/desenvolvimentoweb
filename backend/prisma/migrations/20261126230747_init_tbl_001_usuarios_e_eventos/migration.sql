-- CreateTable
CREATE TABLE "tbl_001_usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USUARIO',
    "documento_criptografado" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tbl_002_eventos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "data" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "curso" TEXT NOT NULL,
    "vagas" INTEGER NOT NULL,
    "criado_por_id" INTEGER,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "tbl_002_eventos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "tbl_001_usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tbl_003_refresh_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token_hash" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "expira_em" DATETIME NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tbl_003_refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "tbl_001_usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tbl_001_usuarios_email_key" ON "tbl_001_usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_003_refresh_tokens_token_hash_key" ON "tbl_003_refresh_tokens"("token_hash");
