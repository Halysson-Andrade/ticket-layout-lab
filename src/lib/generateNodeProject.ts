import JSZip from 'jszip';

interface ProjectConfig {
  companyName: string;
  token: string | null;
  apiBaseUrl: string;
  mapstudioOrigin: string;
}

export async function generateNodeProject(config: ProjectConfig): Promise<Blob> {
  const zip = new JSZip();
  const root = 'mapstudio-integration';

  // ─── .env.example ───
  zip.file(`${root}/.env.example`, `# Configuração do Servidor
PORT=3000
NODE_ENV=development

# Token de integração MapStudio
MAPSTUDIO_TOKEN=${config.token || 'SEU_TOKEN_AQUI'}
MAPSTUDIO_API_URL=${config.apiBaseUrl}
MAPSTUDIO_REDIRECT_URL=${config.mapstudioOrigin}/mapstudio

# Banco de Dados (Sequelize)
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mapstudio_integration
DB_USER=root
DB_PASSWORD=
DB_LOGGING=true
`);

  // ─── .env (com token se disponível) ───
  zip.file(`${root}/.env`, `PORT=3000
NODE_ENV=development

MAPSTUDIO_TOKEN=${config.token || 'SEU_TOKEN_AQUI'}
MAPSTUDIO_API_URL=${config.apiBaseUrl}
MAPSTUDIO_REDIRECT_URL=${config.mapstudioOrigin}/mapstudio

DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mapstudio_integration
DB_USER=root
DB_PASSWORD=
DB_LOGGING=true
`);

  // ─── .gitignore ───
  zip.file(`${root}/.gitignore`, `node_modules/
.env
dist/
logs/
*.log
`);

  // ─── package.json ───
  zip.file(`${root}/package.json`, JSON.stringify({
    name: 'mapstudio-integration',
    version: '1.0.0',
    description: `Projeto de integração MapStudio — ${config.companyName}`,
    main: 'src/app.js',
    scripts: {
      start: 'node src/app.js',
      dev: 'nodemon src/app.js',
      'db:migrate': 'npx sequelize-cli db:migrate',
      'db:migrate:undo': 'npx sequelize-cli db:migrate:undo',
      'db:seed': 'npx sequelize-cli db:seed:all',
    },
    dependencies: {
      express: '^4.18.2',
      sequelize: '^6.37.1',
      mysql2: '^3.9.1',
      pg: '^8.11.3',
      'pg-hstore': '^2.3.4',
      dotenv: '^16.4.1',
      cors: '^2.8.5',
      helmet: '^7.1.0',
      morgan: '^1.10.0',
      crypto: '*',
    },
    devDependencies: {
      nodemon: '^3.0.3',
      'sequelize-cli': '^6.6.2',
    },
  }, null, 2));

  // ─── .sequelizerc ───
  zip.file(`${root}/.sequelizerc`, `const path = require('path');

module.exports = {
  config: path.resolve('src', 'config', 'database.js'),
  'models-path': path.resolve('src', 'models'),
  'migrations-path': path.resolve('src', 'database', 'migrations'),
  'seeders-path': path.resolve('src', 'database', 'seeders'),
};
`);

  // ─── src/config/database.js ───
  zip.file(`${root}/src/config/database.js`, `require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mapstudio_integration',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  },
};
`);

  // ─── src/config/app.js ───
  zip.file(`${root}/src/config/app.js`, `require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  mapstudio: {
    token: process.env.MAPSTUDIO_TOKEN,
    apiUrl: process.env.MAPSTUDIO_API_URL,
    redirectUrl: process.env.MAPSTUDIO_REDIRECT_URL,
  },
};
`);

  // ─── src/models/index.js ───
  zip.file(`${root}/src/models/index.js`, `const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
  }
);

const Evento = require('./Evento')(sequelize);
const Setor = require('./Setor')(sequelize);
const Mapa = require('./Mapa')(sequelize);
const Usuario = require('./Usuario')(sequelize);

// Associações
Evento.hasMany(Setor, { foreignKey: 'evento_id', as: 'setores' });
Setor.belongsTo(Evento, { foreignKey: 'evento_id', as: 'evento' });

Evento.hasOne(Mapa, { foreignKey: 'evento_id', as: 'mapa' });
Mapa.belongsTo(Evento, { foreignKey: 'evento_id', as: 'evento' });

module.exports = {
  sequelize,
  Sequelize,
  Evento,
  Setor,
  Mapa,
  Usuario,
};
`);

  // ─── src/models/Evento.js ───
  zip.file(`${root}/src/models/Evento.js`, `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Evento = sequelize.define('Evento', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    external_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'ID externo usado na integração (id_evento)',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    venue: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo', 'encerrado'),
      defaultValue: 'ativo',
    },
  }, {
    tableName: 'eventos',
    timestamps: true,
    underscored: true,
  });

  return Evento;
};
`);

  // ─── src/models/Setor.js ───
  zip.file(`${root}/src/models/Setor.js`, `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Setor = sequelize.define('Setor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    evento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'hsl(200, 70%, 50%)',
      comment: 'Cor HSL para exibição no MapStudio',
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo'),
      defaultValue: 'ativo',
    },
  }, {
    tableName: 'setores',
    timestamps: true,
    underscored: true,
  });

  return Setor;
};
`);

  // ─── src/models/Mapa.js ───
  zip.file(`${root}/src/models/Mapa.js`, `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Mapa = sequelize.define('Mapa', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    evento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    external_map_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'ID do mapa no MapStudio',
    },
    map_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON completo do mapa recebido do MapStudio',
    },
    sync_status: {
      type: DataTypes.ENUM('OK', 'PENDENTE', 'ERRO'),
      defaultValue: 'PENDENTE',
    },
    last_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'mapas',
    timestamps: true,
    underscored: true,
  });

  return Mapa;
};
`);

  // ─── src/models/Usuario.js ───
  zip.file(`${root}/src/models/Usuario.js`, `const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Usuario = sequelize.define('Usuario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    external_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'ID/token do usuário usado na integração (id_usuario)',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('ativo', 'inativo'),
      defaultValue: 'ativo',
    },
  }, {
    tableName: 'usuarios',
    timestamps: true,
    underscored: true,
  });

  return Usuario;
};
`);

  // ─── Migrations ───
  const timestamp = '20250101000000';

  zip.file(`${root}/src/database/migrations/${timestamp}-create-eventos.js`, `'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('eventos', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      external_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      venue: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo', 'encerrado'),
        defaultValue: 'ativo',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('eventos');
  },
};
`);

  zip.file(`${root}/src/database/migrations/${timestamp}-create-setores.js`.replace('000000', '000001'), `'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('setores', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      evento_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'eventos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      color: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'hsl(200, 70%, 50%)',
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo'),
        defaultValue: 'ativo',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('setores');
  },
};
`);

  zip.file(`${root}/src/database/migrations/${timestamp}-create-mapas.js`.replace('000000', '000002'), `'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mapas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      evento_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'eventos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      external_map_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      map_json: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      sync_status: {
        type: Sequelize.ENUM('OK', 'PENDENTE', 'ERRO'),
        defaultValue: 'PENDENTE',
      },
      last_sync_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('mapas');
  },
};
`);

  zip.file(`${root}/src/database/migrations/${timestamp}-create-usuarios.js`.replace('000000', '000003'), `'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      external_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('ativo', 'inativo'),
        defaultValue: 'ativo',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
`);

  // ─── src/database/seeders ───
  zip.file(`${root}/src/database/seeders/.gitkeep`, '');

  // ─── src/services/setoresService.js ───
  zip.file(`${root}/src/services/setoresService.js`, `const { Setor, Evento } = require('../models');

class SetoresService {
  /**
   * Lista setores de um evento pelo external_id (id_evento)
   */
  async listByEvento(idEvento) {
    const evento = await Evento.findOne({
      where: { external_id: idEvento },
    });

    if (!evento) {
      const error = new Error('Evento não encontrado');
      error.status = 404;
      throw error;
    }

    const setores = await Setor.findAll({
      where: { evento_id: evento.id, status: 'ativo' },
      attributes: ['id', 'name', 'color'],
      order: [['name', 'ASC']],
    });

    return setores;
  }
}

module.exports = new SetoresService();
`);

  // ─── src/services/mapasService.js ───
  zip.file(`${root}/src/services/mapasService.js`, `const { Mapa, Evento } = require('../models');

class MapasService {
  /**
   * Busca mapa pelo id_evento (external_id do evento)
   */
  async getByEvento(idEvento) {
    const evento = await Evento.findOne({
      where: { external_id: idEvento },
    });

    if (!evento) {
      return null;
    }

    const mapa = await Mapa.findOne({
      where: { evento_id: evento.id },
    });

    return mapa;
  }

  /**
   * Busca mapa pelo ID do mapa
   */
  async getById(mapId) {
    return Mapa.findByPk(mapId);
  }

  /**
   * Cria um novo mapa para o evento
   */
  async create(data) {
    const { id_evento, map_id, map_json } = data;

    const evento = await Evento.findOne({
      where: { external_id: id_evento },
    });

    if (!evento) {
      const error = new Error('Evento não encontrado');
      error.status = 404;
      throw error;
    }

    // Verifica se já existe mapa para o evento
    const existing = await Mapa.findOne({ where: { evento_id: evento.id } });
    if (existing) {
      const error = new Error('Já existe um mapa para este evento. Use PUT para atualizar.');
      error.status = 409;
      throw error;
    }

    const mapa = await Mapa.create({
      evento_id: evento.id,
      external_map_id: map_id,
      map_json,
      sync_status: 'OK',
      last_sync_at: new Date(),
    });

    return mapa;
  }

  /**
   * Atualiza mapa existente
   */
  async update(data) {
    const { id_evento, map_id, map_json } = data;

    const evento = await Evento.findOne({
      where: { external_id: id_evento },
    });

    if (!evento) {
      const error = new Error('Evento não encontrado');
      error.status = 404;
      throw error;
    }

    const mapa = await Mapa.findOne({ where: { evento_id: evento.id } });
    if (!mapa) {
      const error = new Error('Mapa não encontrado para este evento');
      error.status = 404;
      throw error;
    }

    await mapa.update({
      external_map_id: map_id || mapa.external_map_id,
      map_json,
      sync_status: 'OK',
      last_sync_at: new Date(),
    });

    return mapa;
  }
}

module.exports = new MapasService();
`);

  // ─── src/services/permissaoService.js ───
  zip.file(`${root}/src/services/permissaoService.js`, `const { Usuario } = require('../models');

class PermissaoService {
  /**
   * Verifica se o usuário tem permissão para acessar o evento.
   * Personalize esta lógica conforme suas regras de negócio.
   */
  async checkPermissao(idEvento, idUsuario) {
    // Exemplo: verificar se o usuário existe e está ativo
    const usuario = await Usuario.findOne({
      where: { external_id: idUsuario, status: 'ativo' },
    });

    if (!usuario) {
      return {
        allowed: false,
        message: \`Usuário "\${idUsuario}" não encontrado ou inativo.\`,
      };
    }

    // TODO: Adicione aqui suas regras de permissão
    // Exemplo: verificar se o usuário tem acesso ao evento específico
    // const acesso = await AcessoEvento.findOne({ where: { usuario_id: usuario.id, evento_id } });

    return {
      allowed: true,
      message: 'Permissão concedida',
    };
  }
}

module.exports = new PermissaoService();
`);

  // ─── src/services/integrationService.js ───
  zip.file(`${root}/src/services/integrationService.js`, `const crypto = require('crypto');
const appConfig = require('../config/app');

class IntegrationService {
  /**
   * Valida a assinatura HMAC do payload recebido do MapStudio.
   * O MapStudio assina o payload com HMAC-SHA256 usando o hash SHA-256 do token como chave.
   */
  validateSignature(payload, receivedSignature) {
    const { id_evento, id_usuario, timestamp } = payload;
    const payloadStr = JSON.stringify({ id_evento, id_usuario, timestamp });

    // O MapStudio usa o hash do token como chave HMAC
    const tokenHash = crypto
      .createHash('sha256')
      .update(appConfig.mapstudio.token)
      .digest('hex');

    const expectedSignature = crypto
      .createHmac('sha256', tokenHash)
      .update(payloadStr)
      .digest('hex');

    return expectedSignature === receivedSignature;
  }

  /**
   * Gera o código de troca chamando a API do MapStudio.
   * Usado quando o sistema do cliente precisa abrir o editor para o usuário.
   */
  async getExchangeCode(idEvento, idUsuario) {
    const res = await fetch(\`\${appConfig.mapstudio.apiUrl}/integration-auth\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: appConfig.mapstudio.token,
        id_evento: idEvento,
        id_usuario: idUsuario,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.error || 'Erro ao obter código de troca');
      error.status = res.status;
      throw error;
    }

    return data;
  }
}

module.exports = new IntegrationService();
`);

  // ─── src/controllers/setoresController.js ───
  zip.file(`${root}/src/controllers/setoresController.js`, `const setoresService = require('../services/setoresService');

class SetoresController {
  /**
   * GET /api/setores?id_evento=EVT-001
   * Retorna lista de setores do evento.
   * Este endpoint é chamado pelo MapStudio via url_list_setores.
   */
  async list(req, res, next) {
    try {
      const { id_evento } = req.query;

      if (!id_evento) {
        return res.status(400).json({ error: 'id_evento é obrigatório' });
      }

      const setores = await setoresService.listByEvento(id_evento);

      return res.json({ setores });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SetoresController();
`);

  // ─── src/controllers/mapasController.js ───
  zip.file(`${root}/src/controllers/mapasController.js`, `const mapasService = require('../services/mapasService');

class MapasController {
  /**
   * GET /api/mapas?id_evento=EVT-001
   * Retorna mapa existente para o evento.
   * Este endpoint é chamado pelo MapStudio via url_get_mapa.
   */
  async get(req, res, next) {
    try {
      const { id_evento, map_id } = req.query;

      let mapa;
      if (map_id) {
        mapa = await mapasService.getById(map_id);
      } else if (id_evento) {
        mapa = await mapasService.getByEvento(id_evento);
      } else {
        return res.status(400).json({ error: 'id_evento ou map_id é obrigatório' });
      }

      if (!mapa) {
        return res.status(404).json({ error: 'not found' });
      }

      return res.json({
        id: mapa.id,
        external_map_id: mapa.external_map_id,
        map_json: mapa.map_json,
        sync_status: mapa.sync_status,
        created_at: mapa.created_at,
        updated_at: mapa.updated_at,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/mapas
   * Cria um novo mapa para o evento.
   * Este endpoint é chamado pelo MapStudio via url_create_mapa.
   */
  async create(req, res, next) {
    try {
      const { map_id, id_evento, map_json } = req.body;

      if (!id_evento || !map_json) {
        return res.status(400).json({ error: 'id_evento e map_json são obrigatórios' });
      }

      const mapa = await mapasService.create({ id_evento, map_id, map_json });

      return res.json({
        success: true,
        message: 'Mapa criado com sucesso',
        external_map_id: \`MAP-\${mapa.id}\`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/mapas
   * Atualiza mapa existente.
   * Este endpoint é chamado pelo MapStudio via url_update_mapa.
   */
  async update(req, res, next) {
    try {
      const { map_id, id_evento, map_json } = req.body;

      if (!id_evento || !map_json) {
        return res.status(400).json({ error: 'id_evento e map_json são obrigatórios' });
      }

      await mapasService.update({ id_evento, map_id, map_json });

      return res.json({
        success: true,
        message: 'Mapa atualizado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MapasController();
`);

  // ─── src/controllers/permissaoController.js ───
  zip.file(`${root}/src/controllers/permissaoController.js`, `const permissaoService = require('../services/permissaoService');
const integrationService = require('../services/integrationService');

class PermissaoController {
  /**
   * POST /api/permissao
   * Verifica se o usuário tem permissão para acessar o evento.
   * Este endpoint é chamado pelo MapStudio via url_check_permissao.
   * O payload recebido contém uma assinatura HMAC-SHA256.
   */
  async check(req, res, next) {
    try {
      const { id_evento, id_usuario, timestamp, signature } = req.body;

      if (!id_evento || !id_usuario) {
        return res.status(400).json({ error: 'id_evento e id_usuario são obrigatórios' });
      }

      // Validar assinatura HMAC (opcional mas recomendado)
      if (signature) {
        const isValid = integrationService.validateSignature(
          { id_evento, id_usuario, timestamp },
          signature
        );

        if (!isValid) {
          return res.status(403).json({
            allowed: false,
            message: 'Assinatura inválida',
          });
        }
      }

      const result = await permissaoService.checkPermissao(id_evento, id_usuario);

      if (!result.allowed) {
        return res.status(403).json(result);
      }

      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PermissaoController();
`);

  // ─── src/controllers/integrationController.js ───
  zip.file(`${root}/src/controllers/integrationController.js`, `const integrationService = require('../services/integrationService');
const appConfig = require('../config/app');

class IntegrationController {
  /**
   * GET /api/abrir-mapa/:eventoId
   * Endpoint de conveniência que obtém o exchange code e redireciona
   * o usuário para o MapStudio.
   */
  async abrirMapa(req, res, next) {
    try {
      const { eventoId } = req.params;
      
      // TODO: Obter o ID do usuário da sua sessão/autenticação
      const idUsuario = req.user?.externalId || req.query.id_usuario;

      if (!idUsuario) {
        return res.status(400).json({ error: 'Usuário não identificado' });
      }

      const { exchange_code, error } = await integrationService.getExchangeCode(
        eventoId,
        idUsuario
      );

      if (error) {
        return res.status(403).json({ error });
      }

      // Redirecionar para o MapStudio
      const redirectUrl = \`\${appConfig.mapstudio.redirectUrl}?code=\${exchange_code}\`;
      return res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IntegrationController();
`);

  // ─── src/routes/setores.js ───
  zip.file(`${root}/src/routes/setores.js`, `const { Router } = require('express');
const setoresController = require('../controllers/setoresController');

const router = Router();

// GET /api/setores?id_evento=EVT-001
router.get('/', (req, res, next) => setoresController.list(req, res, next));

module.exports = router;
`);

  // ─── src/routes/mapas.js ───
  zip.file(`${root}/src/routes/mapas.js`, `const { Router } = require('express');
const mapasController = require('../controllers/mapasController');

const router = Router();

// GET /api/mapas?id_evento=EVT-001
router.get('/', (req, res, next) => mapasController.get(req, res, next));

// POST /api/mapas (criação)
router.post('/', (req, res, next) => mapasController.create(req, res, next));

// PUT /api/mapas (atualização)
router.put('/', (req, res, next) => mapasController.update(req, res, next));

module.exports = router;
`);

  // ─── src/routes/permissao.js ───
  zip.file(`${root}/src/routes/permissao.js`, `const { Router } = require('express');
const permissaoController = require('../controllers/permissaoController');

const router = Router();

// POST /api/permissao
router.post('/', (req, res, next) => permissaoController.check(req, res, next));

module.exports = router;
`);

  // ─── src/routes/integration.js ───
  zip.file(`${root}/src/routes/integration.js`, `const { Router } = require('express');
const integrationController = require('../controllers/integrationController');

const router = Router();

// GET /api/abrir-mapa/:eventoId?id_usuario=xxx
router.get('/abrir-mapa/:eventoId', (req, res, next) => integrationController.abrirMapa(req, res, next));

module.exports = router;
`);

  // ─── src/routes/index.js ───
  zip.file(`${root}/src/routes/index.js`, `const { Router } = require('express');
const setoresRoutes = require('./setores');
const mapasRoutes = require('./mapas');
const permissaoRoutes = require('./permissao');
const integrationRoutes = require('./integration');

const router = Router();

router.use('/setores', setoresRoutes);
router.use('/mapas', mapasRoutes);
router.use('/permissao', permissaoRoutes);
router.use('/', integrationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
`);

  // ─── src/middlewares/errorHandler.js ───
  zip.file(`${root}/src/middlewares/errorHandler.js`, `/**
 * Middleware global de tratamento de erros
 */
module.exports = (err, req, res, _next) => {
  console.error(\`[\${new Date().toISOString()}] Error:\`, err.message);

  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message;

  res.status(status).json({ error: message });
};
`);

  // ─── src/app.js ───
  zip.file(`${root}/src/app.js`, `require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { sequelize } = require('./models');
const appConfig = require('./config/app');

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api', routes);

// Tratamento de erros
app.use(errorHandler);

// Inicialização
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida.');

    app.listen(appConfig.port, () => {
      console.log(\`🚀 Servidor rodando na porta \${appConfig.port}\`);
      console.log(\`📋 Health check: http://localhost:\${appConfig.port}/api/health\`);
      console.log('');
      console.log('Endpoints MapStudio:');
      console.log(\`  GET  /api/setores?id_evento=XXX      → url_list_setores\`);
      console.log(\`  GET  /api/mapas?id_evento=XXX         → url_get_mapa\`);
      console.log(\`  POST /api/mapas                       → url_create_mapa\`);
      console.log(\`  PUT  /api/mapas                       → url_update_mapa\`);
      console.log(\`  POST /api/permissao                   → url_check_permissao\`);
      console.log(\`  GET  /api/abrir-mapa/:eventoId        → Redireciona para MapStudio\`);
    });
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco:', error.message);
    process.exit(1);
  }
}

start();
`);

  // ─── README.md ───
  zip.file(`${root}/README.md`, `# MapStudio Integration — ${config.companyName}

Projeto Node.js + Express para integração com o MapStudio.

## Requisitos

- Node.js 18+
- MySQL, PostgreSQL ou outro banco suportado pelo Sequelize

## Instalação

\`\`\`bash
npm install
\`\`\`

## Configuração

1. Edite o arquivo \`.env\` com suas credenciais de banco de dados
2. O token de integração já está configurado no \`.env\`

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| \`PORT\` | Porta do servidor (padrão: 3000) |
| \`MAPSTUDIO_TOKEN\` | Token de integração da empresa |
| \`MAPSTUDIO_API_URL\` | URL base da API do MapStudio |
| \`MAPSTUDIO_REDIRECT_URL\` | URL de redirecionamento para o editor |
| \`DB_DIALECT\` | Tipo do banco: \`mysql\`, \`postgres\`, \`sqlite\`, \`mariadb\`, \`mssql\` |
| \`DB_HOST\` | Host do banco de dados |
| \`DB_PORT\` | Porta do banco de dados |
| \`DB_NAME\` | Nome do banco de dados |
| \`DB_USER\` | Usuário do banco de dados |
| \`DB_PASSWORD\` | Senha do banco de dados |

## Banco de Dados

### Criar banco
\`\`\`sql
CREATE DATABASE mapstudio_integration;
\`\`\`

### Executar migrations
\`\`\`bash
npm run db:migrate
\`\`\`

### Reverter migrations
\`\`\`bash
npm run db:migrate:undo
\`\`\`

## Executar

\`\`\`bash
# Desenvolvimento
npm run dev

# Produção
npm start
\`\`\`

## Endpoints

### Endpoints consumidos pelo MapStudio

Configure estas URLs no painel de integração:

| URL no painel | Endpoint | Método | Descrição |
|---|---|---|---|
| \`url_list_setores\` | \`/api/setores?id_evento=XXX\` | GET | Lista setores do evento |
| \`url_get_mapa\` | \`/api/mapas?id_evento=XXX\` | GET | Retorna mapa existente |
| \`url_create_mapa\` | \`/api/mapas\` | POST | Recebe mapa criado |
| \`url_update_mapa\` | \`/api/mapas\` | PUT | Recebe mapa atualizado |
| \`url_check_permissao\` | \`/api/permissao\` | POST | Verifica permissão do usuário |

### Endpoint de conveniência

| Endpoint | Método | Descrição |
|---|---|---|
| \`/api/abrir-mapa/:eventoId\` | GET | Obtém exchange code e redireciona para o MapStudio |
| \`/api/health\` | GET | Health check |

## Estrutura do Projeto

\`\`\`
src/
├── app.js                    # Entry point
├── config/
│   ├── app.js                # Configurações da aplicação
│   └── database.js           # Configuração Sequelize (multi-ambiente)
├── controllers/
│   ├── setoresController.js  # Controller de setores
│   ├── mapasController.js    # Controller de mapas
│   ├── permissaoController.js # Controller de permissão
│   └── integrationController.js # Controller de integração
├── services/
│   ├── setoresService.js     # Lógica de negócio - setores
│   ├── mapasService.js       # Lógica de negócio - mapas
│   ├── permissaoService.js   # Lógica de negócio - permissão
│   └── integrationService.js # Validação HMAC e exchange code
├── models/
│   ├── index.js              # Inicialização Sequelize + associações
│   ├── Evento.js             # Model de eventos
│   ├── Setor.js              # Model de setores
│   ├── Mapa.js               # Model de mapas
│   └── Usuario.js            # Model de usuários
├── database/
│   ├── migrations/           # Migrations Sequelize
│   └── seeders/              # Seeders (dados iniciais)
├── routes/
│   ├── index.js              # Agregador de rotas
│   ├── setores.js            # Rotas de setores
│   ├── mapas.js              # Rotas de mapas
│   ├── permissao.js          # Rotas de permissão
│   └── integration.js        # Rotas de integração
└── middlewares/
    └── errorHandler.js       # Tratamento global de erros
\`\`\`

## Personalização

### Banco de dados
Altere \`DB_DIALECT\` no \`.env\` para usar outro banco:
- \`mysql\` (padrão)
- \`postgres\`
- \`sqlite\`
- \`mariadb\`
- \`mssql\`

### Permissões
Edite \`src/services/permissaoService.js\` para implementar suas regras de negócio.

### Validação HMAC
A validação de assinatura está em \`src/services/integrationService.js\`. O MapStudio assina os payloads com HMAC-SHA256.
`);

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
