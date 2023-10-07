import { Poll } from "../model/Poll.js";
import { User } from "../model/User.js";
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { log } from '../utils/log.js';

const handlePollCreate = async (req, res) => {
    const { title, questions, settings, description, image_path } = req.body;
    if (!title || !questions || !settings) return res.status(400).json({ message: 'Missing data' });

    const polls = await Poll.find({ ownerId: req.user });
    const duplicate = polls.find(poll => poll.title === title);
    if (duplicate) return res.status(409).json({ message: `A poll with title '${title}' already exists` });

    try {
        const newPoll = await Poll.create({
            _id: uuid(),
            ownerId: req.user,
            title: title,
            description: description,
            image_path: image_path,
            creation_date: format(Date.now(), 'dd/MM/yyyy'),
            creation_time: format(Date.now(), 'HH:mm:ss'),
            questions: questions,
            settings: settings
        });

        const user = await User.findById(req.user);
        user.polls_created.push(newPoll.id);
        user.save();

        res.status(201).json({
            message: 'Poll created',
            poll: newPoll
        });
        log(`a new poll (id: ${newPoll.id}) has been created by '${user.username}' (id: ${user.id})`, 'pollsLog');
    } catch (err) {
        res.status(500).json({ message: err });
    }
}

const handlePollDelete = async (req, res) => {
    const { pollId } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });

    if (foundPoll.ownerId !== req.user) return res.status(404).json({ message: `User (id: ${req.user}) isn't the owner of poll (id: ${foundPoll.id})` });

    const user = await User.findById(req.user);
    const updatedUserPolls = user.polls_created.filter(poll => poll !== pollId);

    try {
        await Poll.deleteOne({ _id: foundPoll.id });
        await User.updateOne({_id: req.user}, {polls_created: updatedUserPolls});
        res.status(200).json({ message: `'${foundPoll.title}' has been deleted` });
        log(`poll '${foundPoll.title}' (id: ${foundPoll.id}) has been deleted by '${user.username}' (id: ${user.id})`, 'pollsLog');
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handlePollEdit = async (req, res) => {
    const { pollId, newTitle, questions, settings } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });
    if (!newTitle || !questions || !settings) return res.status(400).json({ message: 'Missing data' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });

    if (foundPoll.ownerId !== req.user) return res.status(404).json({ message: `User (id: ${req.user}) isn't the owner of poll (id: ${foundPoll.id})` });

    const polls = await Poll.find({ ownerId: req.user });
    const pollExist = polls.find(poll => poll.title === newTitle);
    if (pollExist) return res.status(409).json({ message: `A poll with title '${newTitle}' already exists` });

    const oldPollString = JSON.stringify(foundPoll);
    const user = await User.findById(req.user);

    try {
        foundPoll.title = newTitle;
        foundPoll.questions = questions;
        foundPoll.settings = settings;
        await foundPoll.save();
        res.status(200).json({
            message: `poll '${foundPoll.id}' has been updated`,
            poll: foundPoll
        });

        log(`poll (id: ${foundPoll.id}) has been edited by '${user.username}' (id: ${user.id})\n
        before edit: ${oldPollString}\n
        after edit: ${JSON.stringify(foundPoll)}`, 'pollsLog');

    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handlePollRename = async (req, res) => {
    const { pollId, newTitle } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });
    if (!newTitle) return res.status(400).json({ message: 'Missing new title' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });

    if (foundPoll.ownerId !== req.user) return res.status(404).json({ message: `User (id: ${req.user}) isn't the owner of poll (id: ${foundPoll.id})` });

    const polls = await Poll.find({ ownerId: req.user });
    const pollExist = polls.find(poll => poll.title === newTitle);
    if (pollExist) return res.status(409).json({ message: `A poll with title '${newTitle}' already exists` });

    const oldPollTitle = String(foundPoll.title);
    const user = await User.findById(req.user);

    try {
        foundPoll.title = newTitle;
        await foundPoll.save();
        res.status(200).json({
            message: `poll '${foundPoll.id}' has been renamed to '${newTitle}'`,
            poll: foundPoll
        });

        log(`poll (id: ${foundPoll.id}) has been renamed by '${user.username}'(id: ${user.id})\n
        before rename: ${oldPollTitle}\n
        after rename: ${foundPoll.title}`, 'pollsLog');
    } catch (err) {
        res.status(500).json({ message: err.errors });
    }

}

const handleGetPollAnswers = async (req, res) => {
    const { pollId } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });

    if (foundPoll.ownerId !== req.user) return res.status(404).json({ message: `User (id: ${req.user}) isn't the owner of poll (id: ${foundPoll.id})` });

    if (foundPoll.answers.length === 0) return res.status(204).json({ message: 'No answers' });

    res.json({ answers: foundPoll.answers });
}

const handleGetPollById = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    res.status(200).json({ foundPoll });
}

export default {
    handlePollCreate,
    handlePollDelete,
    handlePollEdit,
    handlePollRename,
    handleGetPollAnswers,
    handleGetPollById,
}