import {Router} from 'express';
import {dbClient} from '../../prisma/client.js';

const router = Router();

router.get('/executions/:executionId', async (req, res) => {
    const {executionId} = req.params;

    const record = await dbClient.execution.findUnique({
        where: {
            id: Number(executionId)
        }
    });

    return res.status(200).json(record);
});

export default router;