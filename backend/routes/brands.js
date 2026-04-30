import express from 'express';
import evaluationEngine from '../services/EvaluationEngine.js';

const router = express.Router();

// GET /api/brands - Get all brands
router.get('/', (req, res) => {
  try {
    if (evaluationEngine.brands.length === 0) {
      evaluationEngine.loadBrands();
    }
    res.json({
      brands: evaluationEngine.brands,
      count: evaluationEngine.brands.length
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// GET /api/brands/:id - Get brand by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (evaluationEngine.brands.length === 0) {
      evaluationEngine.loadBrands();
    }
    const brand = evaluationEngine.brands.find(b => b.id === id);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

export default router;
