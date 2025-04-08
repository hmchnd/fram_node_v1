require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors'); 
const app = express();
const port = process.env.PORT || 3000;


const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Roadmap API',
      version: '1.0.0',
    },
  },
  apis: ['./server.js'], // Path to your API routes
};
app.use(cors())
app.use(cors({
  origin: 'https://framsys-react-app.storage.googleapis.com', // Allow only your frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function for handling database queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Error executing query', { text, err });
    throw err;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Routes for RoadmapTemplate
app.route('/api/roadmap-templates')
  .get(async (req, res) => {
    try {
      const result = await query('SELECT * FROM RoadmapTemplate ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    const { name, description } = req.body;
    const cuid = uuidv4();
    const now = new Date();
    
    try {
      const result = await query(
        'INSERT INTO RoadmapTemplate (cuid, created_at, modified_at, name, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [cuid, now, now, name, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

app.route('/api/roadmap-templates/:id')
  .get(async (req, res, next) => {
    try {
      const result = await query('SELECT * FROM RoadmapTemplate WHERE cuid = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Roadmap template not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .put(async (req, res, next) => {
    const { name, description } = req.body;
    const now = new Date();
    
    try {
      const result = await query(
        'UPDATE RoadmapTemplate SET name = $1, description = $2, modified_at = $3 WHERE cuid = $4 RETURNING *',
        [name, description, now, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Roadmap template not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const result = await query('DELETE FROM RoadmapTemplate WHERE cuid = $1 RETURNING *', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Roadmap template not found' });
      }
      res.json({ message: 'Roadmap template deleted successfully' });
    } catch (err) {
      next(err);
    }
  });

// Routes for TemplateArea
app.route('/api/roadmap-templates/:templateId/areas')
  .get(async (req, res, next) => {
    try {
      const result = await query(
        'SELECT * FROM TemplateArea WHERE parent_key = $1 ORDER BY displaySequence',
        [req.params.templateId]
      );
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    const { name, description, displaySequence } = req.body;
    const cuid = uuidv4();
    const now = new Date();
    
    try {
      const result = await query(
        'INSERT INTO TemplateArea (cuid, created_at, modified_at, parent_key, name, description, displaySequence) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [cuid, now, now, req.params.templateId, name, description, displaySequence]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

app.route('/api/areas/:id')
  .get(async (req, res, next) => {
    try {
      const result = await query('SELECT * FROM TemplateArea WHERE cuid = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Area not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .put(async (req, res, next) => {
    const { name, description, displaySequence } = req.body;
    const now = new Date();
    
    try {
      const result = await query(
        'UPDATE TemplateArea SET name = $1, description = $2, displaySequence = $3, modified_at = $4 WHERE cuid = $5 RETURNING *',
        [name, description, displaySequence, now, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Area not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const result = await query('DELETE FROM TemplateArea WHERE cuid = $1 RETURNING *', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Area not found' });
      }
      res.json({ message: 'Area deleted successfully' });
    } catch (err) {
      next(err);
    }
  });

// Routes for TemplatePhase
app.route('/api/roadmap-templates/:templateId/phases')
  .get(async (req, res, next) => {
    try {
      const result = await query(
        'SELECT * FROM TemplatePhase WHERE parent_key = $1 ORDER BY displaySequence',
        [req.params.templateId]
      );
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    const {
      name, displaySequence, description, planned_start, planned_finish,
      fore_act_start, fore_act_finish, pct_weight, pct_complete,
      initialDuration, durationUnit, state
    } = req.body;
    const cuid = uuidv4();
    const now = new Date();
    
    try {
      const result = await query(
        `INSERT INTO TemplatePhase (
          cuid, created_at, modified_at, parent_key, name, displaySequence, description,
          planned_start, planned_finish, fore_act_start, fore_act_finish,
          pct_weight, pct_complete, initialDuration, durationUnit, state
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
        [
          cuid, now, now, req.params.templateId, name, displaySequence, description,
          planned_start, planned_finish, fore_act_start, fore_act_finish,
          pct_weight, pct_complete, initialDuration, durationUnit, state
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

app.route('/api/phases/:id')
  .get(async (req, res, next) => {
    try {
      const result = await query('SELECT * FROM TemplatePhase WHERE cuid = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .put(async (req, res, next) => {
    const {
      name, displaySequence, description, planned_start, planned_finish,
      fore_act_start, fore_act_finish, pct_weight, pct_complete,
      initialDuration, durationUnit, state
    } = req.body;
    const now = new Date();
    
    try {
      const result = await query(
        `UPDATE TemplatePhase SET 
          name = $1, displaySequence = $2, description = $3,
          planned_start = $4, planned_finish = $5, fore_act_start = $6, fore_act_finish = $7,
          pct_weight = $8, pct_complete = $9, initialDuration = $10, durationUnit = $11, state = $12,
          modified_at = $13
        WHERE cuid = $14 RETURNING *`,
        [
          name, displaySequence, description,
          planned_start, planned_finish, fore_act_start, fore_act_finish,
          pct_weight, pct_complete, initialDuration, durationUnit, state,
          now, req.params.id
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const result = await query('DELETE FROM TemplatePhase WHERE cuid = $1 RETURNING *', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Phase not found' });
      }
      res.json({ message: 'Phase deleted successfully' });
    } catch (err) {
      next(err);
    }
  });

// Routes for TemplateTask
app.route('/api/roadmap-templates/:templateId/tasks')
  .get(async (req, res, next) => {
    try {
      const result = await query(
        'SELECT * FROM TemplateTask WHERE parent_key = $1',
        [req.params.templateId]
      );
      res.json(result.rows);
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    const {
      name, description, planned_start, planned_finish,
      fore_act_start, fore_act_finish, pct_weight, pct_complete,
      optional_flag, state, status, area_id, phase_id
    } = req.body;
    const cuid = uuidv4();
    const now = new Date();
    
    try {
      const result = await query(
        `INSERT INTO TemplateTask (
          cuid, created_at, modified_at, parent_key, name, description,
          planned_start, planned_finish, fore_act_start, fore_act_finish,
          pct_weight, pct_complete, optional_flag, state, status, area_id, phase_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
        [
          cuid, now, now, req.params.templateId, name, description,
          planned_start, planned_finish, fore_act_start, fore_act_finish,
          pct_weight, pct_complete, optional_flag, state, status, area_id, phase_id
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  });

app.route('/api/tasks/:id')
  .get(async (req, res, next) => {
    try {
      const result = await query('SELECT * FROM TemplateTask WHERE cuid = $1', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .put(async (req, res, next) => {
    const {
      name, description, planned_start, planned_finish,
      fore_act_start, fore_act_finish, pct_weight, pct_complete,
      optional_flag, state, status, area_id, phase_id
    } = req.body;
    const now = new Date();
    
    try {
      const result = await query(
        `UPDATE TemplateTask SET 
          name = $1, description = $2,
          planned_start = $3, planned_finish = $4, fore_act_start = $5, fore_act_finish = $6,
          pct_weight = $7, pct_complete = $8, optional_flag = $9, state = $10, status = $11,
          area_id = $12, phase_id = $13, modified_at = $14
        WHERE cuid = $15 RETURNING *`,
        [
          name, description,
          planned_start, planned_finish, fore_act_start, fore_act_finish,
          pct_weight, pct_complete, optional_flag, state, status,
          area_id, phase_id, now, req.params.id
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const result = await query('DELETE FROM TemplateTask WHERE cuid = $1 RETURNING *', [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ message: 'Task deleted successfully' });
    } catch (err) {
      next(err);
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit();
});