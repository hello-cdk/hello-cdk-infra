import express from 'express';

const app = express();

app.use(express.json());

// routes
app.route('/api/debug').all((req, res) => {
    res.json({
        body: req.body,
        query: req.query,
    });
});

// Export the app for serverless-http
export default app;
