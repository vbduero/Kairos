-- ============================================================
--  Manos que Hablan — Inicialización de base de datos
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vocabulario LSC: cada seña conocida por el sistema
CREATE TABLE IF NOT EXISTS signs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word        VARCHAR(100) NOT NULL UNIQUE,
    category    VARCHAR(50),
    description TEXT,
    video_url   VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Historial de traducciones
CREATE TABLE IF NOT EXISTS translations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  VARCHAR(100),
    direction   VARCHAR(20) CHECK (direction IN ('sign_to_text', 'text_to_sign')),
    input_data  TEXT,
    output_data TEXT,
    confidence  FLOAT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Vocabulario inicial LSC
INSERT INTO signs (word, category, description) VALUES
    ('hola',      'saludo',     'Seña de saludo básico'),
    ('gracias',   'cortesía',   'Seña de agradecimiento'),
    ('por favor', 'cortesía',   'Seña de solicitud cortés'),
    ('sí',        'respuesta',  'Afirmación'),
    ('no',        'respuesta',  'Negación'),
    ('ayuda',     'emergencia', 'Solicitud de ayuda')
ON CONFLICT (word) DO NOTHING;