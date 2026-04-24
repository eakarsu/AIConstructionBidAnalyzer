const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');

const callOpenRouter = async (systemPrompt, userData) => {
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    model: process.env.OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(userData) }
    ]
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data.choices[0].message.content;
};

const saveAnalysis = async (feature, inputData, outputData, model) => {
  await pool.query(
    `INSERT INTO ai_analyses (feature, input_data, output_data, model_used) VALUES ($1, $2, $3, $4)`,
    [feature, JSON.stringify(inputData), JSON.stringify({ result: outputData }), model]
  );
};

// POST /api/ai/analyze-bid
router.post('/analyze-bid', auth, async (req, res) => {
  try {
    const systemPrompt = `You are an expert construction bid analyst with 30+ years of experience. Analyze the provided bid data and give a comprehensive assessment including:
1. Overall bid competitiveness (is the price reasonable for the scope?)
2. Potential red flags or concerns
3. Areas where costs seem too high or too low
4. Recommendations for negotiation points
5. Risk factors associated with this bid
6. Comparison to industry standards
Provide your analysis in a structured, detailed format.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('analyze-bid', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI analyze-bid error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to analyze bid.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/estimate-cost
router.post('/estimate-cost', auth, async (req, res) => {
  try {
    const systemPrompt = `You are an expert construction cost estimator with deep knowledge of material costs, labor rates, equipment costs, and regional pricing variations. Based on the provided project details, generate a detailed cost estimate including:
1. Itemized cost breakdown by category (materials, labor, equipment, overhead, profit)
2. Contingency recommendations (percentage and reasoning)
3. Cost per square foot analysis
4. Regional cost adjustments
5. Material price trend considerations
6. Labor market conditions impact
7. Total estimated project cost range (low, expected, high)
Provide specific dollar amounts and percentages in your estimate.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('estimate-cost', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI estimate-cost error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to estimate cost.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/assess-risk
router.post('/assess-risk', auth, async (req, res) => {
  try {
    const systemPrompt = `You are a construction risk management expert. Analyze the provided project data and provide a comprehensive risk assessment including:
1. Identified risks categorized by type (financial, schedule, safety, environmental, regulatory, technical)
2. Risk severity rating (Critical, High, Medium, Low) for each risk
3. Likelihood assessment for each risk
4. Impact analysis if the risk materializes
5. Specific mitigation strategies for each risk
6. Risk priority matrix
7. Recommended contingency plans
8. Overall project risk score and recommendation
Provide actionable insights for risk mitigation.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('assess-risk', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI assess-risk error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to assess risk.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/check-compliance
router.post('/check-compliance', auth, async (req, res) => {
  try {
    const systemPrompt = `You are a construction regulatory compliance expert with extensive knowledge of building codes, OSHA regulations, ADA requirements, environmental regulations, and local building ordinances. Review the provided project data and provide:
1. Applicable building codes and standards (IBC, local amendments)
2. OSHA safety compliance requirements
3. ADA accessibility requirements
4. Environmental compliance (EPA, state environmental agencies)
5. Permit requirements checklist
6. Zoning compliance verification
7. Fire code compliance items
8. Energy code requirements (ASHRAE, IECC)
9. Potential compliance gaps or violations
10. Recommended corrective actions
Flag any critical compliance issues that could halt construction.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('check-compliance', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI check-compliance error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to check compliance.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/analyze-scope
router.post('/analyze-scope', auth, async (req, res) => {
  try {
    const systemPrompt = `You are a construction scope analysis expert specializing in scope definition, scope creep prevention, and work breakdown structures. Analyze the provided project scope and provide:
1. Scope completeness assessment (are there missing elements?)
2. Work Breakdown Structure (WBS) recommendation
3. Scope gap analysis
4. Potential scope creep risks
5. Exclusions that should be explicitly stated
6. Assumptions that need validation
7. Deliverables checklist
8. Scope alignment with budget and timeline
9. Recommendations for scope refinement
10. Division of responsibilities (owner vs. contractor)
Highlight any ambiguities that could lead to disputes.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('analyze-scope', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI analyze-scope error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to analyze scope.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/estimate-timeline
router.post('/estimate-timeline', auth, async (req, res) => {
  try {
    const systemPrompt = `You are a construction scheduling expert with expertise in CPM (Critical Path Method) scheduling, resource leveling, and project timeline optimization. Based on the provided project details, generate:
1. Detailed phase-by-phase timeline with durations
2. Critical path identification
3. Key milestones and deadlines
4. Resource loading considerations
5. Weather impact analysis for the project location
6. Lead time requirements for materials and equipment
7. Inspection and approval hold points
8. Buffer/float recommendations
9. Potential schedule risks and delays
10. Accelerated schedule options if needed
Provide specific date ranges and durations for each phase.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('estimate-timeline', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI estimate-timeline error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to estimate timeline.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/compare-bids
router.post('/compare-bids', auth, async (req, res) => {
  try {
    const systemPrompt = `You are a construction bid evaluation expert specializing in comparative bid analysis. Compare the provided bids and deliver:
1. Side-by-side cost comparison breakdown
2. Scope coverage comparison (what each bid includes/excludes)
3. Value engineering opportunities identified across bids
4. Contractor qualification comparison
5. Schedule comparison
6. Risk comparison between bidders
7. Price normalization (adjusting for scope differences)
8. Best value determination (not just lowest price)
9. Negotiation leverage points for each bid
10. Final recommendation with justification
Provide a clear winner recommendation with supporting rationale.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('compare-bids', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI compare-bids error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to compare bids.', details: err.response?.data || err.message });
  }
});

// POST /api/ai/optimize-materials
router.post('/optimize-materials', auth, async (req, res) => {
  try {
    const systemPrompt = `You are a construction materials optimization expert with deep knowledge of building materials, sustainable alternatives, supply chain management, and value engineering. Analyze the provided materials data and provide:
1. Cost optimization recommendations (alternative materials, bulk purchasing)
2. Sustainable/green material alternatives
3. Material waste reduction strategies
4. Supply chain risk analysis
5. Lead time optimization
6. Quality vs. cost trade-off analysis
7. Local vs. imported material recommendations
8. Recycled/reclaimed material opportunities
9. Material compatibility checks
10. Total material cost savings potential with specific recommendations
Provide specific product suggestions and estimated savings.`;

    const result = await callOpenRouter(systemPrompt, req.body);
    await saveAnalysis('optimize-materials', req.body, result, process.env.OPENROUTER_MODEL);
    res.json({ analysis: result });
  } catch (err) {
    console.error('AI optimize-materials error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to optimize materials.', details: err.response?.data || err.message });
  }
});

module.exports = router;
