import {Router} from 'express';
import {dbClient} from '../../prisma/client.js';

const router = Router();

router.get('/issues', async (req, res) => {
    const { category, name, page = 1, limit = 30 } = req.query;

    try {
        const issues = await dbClient.issue.findMany({
            where: {
                category: category || undefined,
                name: name ? { contains: name } : undefined,
            },
            skip: (page - 1) * limit,
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
        });

        const totalIssues = await dbClient.issue.count({
            where: {
                category: category || undefined,
                name: name ? { contains: name } : undefined,
            },
        });

        return res.status(200).json({
            issues,
            total: totalIssues,
            page: Number(page),
            totalPages: Math.ceil(totalIssues / limit),
        });
    } catch (error) {
        throw new Error(`Failed to fetch issues. ${error.message}`);
    }
});


router.get('/issues/:issueId', async (req, res) => {
    const {issueId} = req.params;

    const issueRecords = await dbClient.issue.findUnique({
        where: {
            id: Number(issueId)
        }
    });

    return res.status(200).json(issueRecords);
});


router.post('/issues', async (req, res) => {
    const issueParams = req.body;

    if (!req.body || !req.body?.name) {
        throw new Error('Unable to create issue without name');
    }

    const issueRecord = await dbClient.issue.create({
        data: issueParams
    });

    return res.status(200).json(issueRecord);
});


router.patch('/issues/:issueId', async (req, res) => {
    const { issueId } = req.params;
    const {name, category, description, portal, service, ticket} = req.body;
    const updateData = {
        name,
        category,
        description,
        portal,
        service,
        ticket
    };

    try {
        const updatedIssue = await dbClient.issue.update({
            where: { id: Number(issueId) },
            data: updateData,
        });

        return res.status(200).json(updatedIssue);
    } catch (error) {
        res.status(400).json({ error: "Failed to update issue" });
    }
});

export default router;