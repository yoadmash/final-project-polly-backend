import { Poll } from "../model/Poll.js";

const handlePollCreate = async (req, res) => {
    const { userId, title, questions, settings } = req.body;
    if (!userId || !title || !questions || !settings) return res.status(400).json({ message: 'missing data' });

    const duplicate = await Poll.findOne({ title: title });
    if (duplicate) return res.status(409).json({ message: `a poll with title '${title}' already exists` });

    try {
        const newPoll = await Poll.create({
            ownerId: userId,
            title: title,
            creation_date: Date.now(),
            questions: questions,
            answers: req.body.answers,
            settings: settings
        });

        res.status(201).json({
            message: 'poll created',
            poll: newPoll
        });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handlePollDelete = async (req, res) => {
    const { pollId } = req.body;
    if (!pollId) return res.status(400).json({ message: 'missing poll id' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `no poll matches id: ${pollId}` });

    try {
        await Poll.deleteOne({ _id: foundPoll.id });
        res.status(200).json({ message: `'${foundPoll.title}' has been deleted` });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handlePollEdit = async (req, res) => {
    const { pollId, title, questions, settings } = req.body;
    if (!pollId) return res.status(400).json({ message: 'missing poll id' });
    if (!title || !questions || !settings) return res.status(400).json({ message: 'missing data' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `no poll matches id: ${pollId}` });
    if(foundPoll.title === title) return res.status(400).json({ message: `a poll with title '${title}' already exists` });

    try {
        foundPoll.title = title;
        foundPoll.questions = questions;
        foundPoll.settings = settings;
        await foundPoll.save();
        res.status(200).json({
            message: `poll '${foundPoll.id}' has been updated`,
            poll: foundPoll
        });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handlePollRename = async (req, res) => {
    const { pollId, newTitle } = req.body;
    if (!pollId) return res.status(400).json({ message: 'missing poll id' });
    if (!newTitle) return res.status(400).json({ message: 'missing new title' });
    
    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `no poll matches id: ${pollId}` });
    if(foundPoll.title === newTitle) return res.status(400).json({ message: `a poll with title '${title}' already exists` });

    try {
        foundPoll.title = newTitle;
        await foundPoll.save();
        res.status(200).json({
            message: `poll '${foundPoll.id}' has been renamed to '${newTitle}'`,
            poll: foundPoll
        });
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }

}

const handleGetPollAnswers = async (req, res) => {
    const { pollId, newTitle } = req.body;
    if (!pollId) return res.status(400).json({ message: 'missing poll id' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `no poll matches id: ${pollId}` });

    if(foundPoll.answers.length === 0) return res.status(204).json({message: 'no answers'});
    res.json({answers: foundPoll.answers});
}

const handleGetPollById = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'missing poll id' });

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: `no poll matches id: ${id}` });

    res.status(302).json({ foundPoll });
}

export default {
    handlePollCreate,
    handlePollDelete,
    handlePollEdit,
    handlePollRename,
    handleGetPollAnswers,
    handleGetPollById,
}