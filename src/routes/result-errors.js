import {Router} from 'express';
import {dbClient} from '../../prisma/client.js';
import {runReview} from '../lib/error-analyzer.js';

const router = Router();

router.patch('/result-errors/:resultErrorId/assign-issue', async (req, res) => {
    const { resultErrorId } = req.params;
    const { assumptionId } = req.body;

    try {
        const updatedRecord = await dbClient.resultError.update({
            where: { id: Number(resultErrorId) },
            data: {
                assumptions: {
                    connect: {
                        id: assumptionId
                    }
                }
            },
            include: { issue: true }
        });

        return res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(400).json({ error: "Failed to assign issue" });
    }
});

router.patch('/result-errors/:resultErrorId/review', async (req, res) => {
    const { resultErrorId } = req.params;

    try {
        const resultError = await dbClient.resultError.findUnique({
            where: {
                id: Number(resultErrorId)
            }
        });

        const record = await runReview(resultError);

        console.log(record);

        return res.status(200).json(record);
    } catch (error) {
        return res.status(400).json({
            error: `Failed to review result error #${resultErrorId}, ${error.message}`
        });
    }
});

router.patch('/result-errors/bulk-review', async (req, res) => {
    const {errorIds} = req.body;
    const reviewResults = [];

    try {
        for (const errorId of errorIds) {
            const resultError = await dbClient.resultError.findUnique({
                where: {
                    id: Number(errorId)
                }
            });

            const record = await runReview(resultError);
            reviewResults.push(record);
        }

        return res.status(200).json(reviewResults);
    } catch (e) {
        throw new Error(`Unable to complete auto review for: ${errorIds.join(',')}. ${e.message}`);
    }
});


export default router;