import {Router} from 'express';
import {dbClient} from '../../prisma/client.js';

const router = Router();

router.get('/specs/:specId', async (req, res) => {
    const {specId} = req.params;

    const record = await dbClient.spec.findUnique({
        where: {
            id: Number(specId)
        }
    });

    record.tags = JSON.parse(record.tags);
    record.annotations = JSON.parse(record.annotations);

    return res.status(200).json(record);
});

export default router;