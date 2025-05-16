import {Router} from 'express';
import {dbClient} from '../../prisma/client.js';

const router = Router();

router.patch('/assumptions/:assumptionId', async (req, res) => {
    const {assumptionId} = req.params;
    const assumption = req.body;

    try {
        if (assumption.madeBy !== 'user') {
            throw new Error('Only real user can modify assumptions');
        }

        if (assumption.isConfirmed) {
            const updatedRecord = await dbClient.assumption.update({
                where: {
                    id: Number(assumptionId)
                },
                data: req.body,
                include: {
                    issue: true
                }
            });

            return res.status(200).json(updatedRecord);
        }

        // delete record if user confirmed assumption is wrong (isConfirmed === FALSE)
        await dbClient.assumption.delete({
            where: {
                id: Number(assumptionId)
            }
        });

        return res.status(204).send();
    } catch (error) {
        res.status(400).json({error: `Failed to update assumption, ${error.message}`});
    }
});

router.post('/assumptions', async (req, res) => {
    const {issueId, resultErrorId, ...rest} = req.body;

    if(!issueId) {
        throw new Error('Unable to create new assumption: missing issue id');
    }

    if(!resultErrorId) {
        throw new Error('Unable to create new assumption: missing result error id');
    }

    const assumption = {
        issueId: Number(issueId),
        resultErrorId: Number(resultErrorId),
        ...rest
    };

    try {
        const updatedRecord = await dbClient.assumption.create({
            data: assumption
        });

        return res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(400).json({error: `Failed to update assumption, ${error.message}`});
    }
})

export default router;