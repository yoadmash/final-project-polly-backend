import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { logToDB } from '../utils/log.js';
import { Poll } from "../model/Poll.js";
import { User } from "../model/User.js";

import fs from 'fs';
import path from 'path';
import dirname_filename from '../utils/dirname_filename.js';

const { __dirname } = dirname_filename(import.meta);

const handlePollCreate = async (req, res) => {
    const { title, questions, settings, description, image_path } = JSON.parse(req.body.form_data);
    if (!title || !questions || !settings) return res.status(400).json({ message: 'Missing data' });

    const polls = await Poll.find({ "owner.id": req.user });
    const duplicate = polls.find(poll => poll.title === title);
    if (duplicate) return res.status(409).json({ message: `A poll with title '${title}' already exists` });

    const foundUser = await User.findById(req.user).select('username');
    if (!foundUser) return res.status(404).json({ message: 'User not found' });

    let newPoll = {};
    try {
        newPoll = await Poll.create({
            _id: uuid(),
            owner: { id: foundUser.id, username: foundUser.username },
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
        logToDB({
            poll_id: newPoll.id,
            poll_title: newPoll.title,
            log_type: 'polls',
            log_message: `new poll created by ${foundUser.username}`,
        }, false);

        if (req.files) {
            const file = Object.values(req.files)[0];
            const fileName = newPoll.id;
            const extName = path.extname(file.name);
            const fullFileName = `${fileName}${extName}`;
            const filePath = path.join(__dirname, '..', 'public', 'polls_pics', fullFileName);
            const pollFilePath = `/polls_pics/${fullFileName}`;
            file.mv(filePath, async (err) => {
                if (err) return res.status(500).json({ message: 'something is wrong, unable to upload' });
                try {
                    const createdPoll = await Poll.findById(newPoll.id);
                    createdPoll.image_path = pollFilePath;
                    await createdPoll.save();
                } catch (err) {
                    res.status(500).json({ message: err.errors });
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ message: err });
    }
}

const handlePollDelete = async (req, res) => {
    const { pollId } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });

    const foundUser = await User.findById(req.user);
    if (!foundUser) return res.status(404).json({ message: 'User not found' });

    if (foundPoll.owner.id !== foundUser.id) { // removes poll from answered or visited
        const answered = foundUser.polls_answered.includes(pollId);
        const visited = foundUser.polls_visited.includes(pollId);

        if (answered) {
            foundUser.polls_answered = foundUser.polls_answered.filter(poll => poll !== pollId);
            const answer_exists = foundPoll.answers.find(answer => answer.answered_by.user_id === foundUser.id);
            if (answer_exists && foundPoll.settings.usersCanDeleteAnswer) { // removes the answer from the poll itself
                foundPoll.answers = foundPoll.answers.filter(answer => answer.answered_by.user_id !== foundUser.id);
                await foundPoll.save();
                logToDB({
                    poll_id: foundPoll.id,
                    poll_title: foundPoll.title,
                    log_message: `${foundUser.username} deleted his answer`,
                    log_type: 'polls'
                }, false);
            }
        }

        if (visited) {
            foundUser.polls_visited = foundUser.polls_visited.filter(poll => poll !== pollId);
        }

        await foundUser.save();
        return res.sendStatus(200);
    }

    if (foundPoll.image_path?.length > 0) {
        const fullPath = path.join(__dirname, '../public', foundPoll.image_path);
        fs.unlink(fullPath, async (err) => {
            if (err) {
                logToDB({
                    poll_id: foundPoll.id,
                    poll_title: foundPoll.title,
                    log_message: `unable to delete poll image`,
                    log_type: 'polls'
                }, true);
            }
        });
    }

    const usersAnswered = [];
    foundPoll?.answers?.forEach(answer => {
        usersAnswered.push(answer.answered_by);
    });

    const updatedUserPolls = foundUser.polls_created.filter(poll => poll !== pollId);

    if (usersAnswered.length > 0) {
        usersAnswered.forEach(async (user) => {
            const foundUserAnswered = await User.findById(user.user_id);
            if (foundUserAnswered) {
                const updatedPollsAnswerd = foundUserAnswered.polls_answered.filter(poll => poll !== pollId);
                foundUserAnswered.polls_answered = updatedPollsAnswerd;
                try {
                    await foundUserAnswered.save();
                } catch (err) {
                    logToDB({
                        poll_id: foundPoll.id,
                        poll_title: foundPoll.title,
                        log_message: `unable to delete poll fro\npoll_answered of user: ${user.user_name} (${user.user_id})`,
                        log_type: 'polls'
                    }, true);
                }
            }
        });
    }

    try {
        await Poll.deleteOne({ _id: foundPoll.id });
        await User.updateOne({ _id: req.user }, { polls_created: updatedUserPolls });
        res.status(200).json({ message: `'${foundPoll.title}' has been deleted` });
        logToDB({
            poll_id: foundPoll.id,
            poll_title: foundPoll.title,
            log_message: `poll deleted by ${foundUser.username}`,
            log_type: 'polls'
        }, false);
    } catch (err) {
        logToDB({
            poll_id: foundPoll.id,
            poll_title: foundPoll.title,
            log_message: `unable to delete poll`,
            log_type: 'polls'
        }, true);
        return res.status(500).json({ message: err.message });
    }
}

const handlePollEdit = async (req, res) => {
    const { id } = req.params;
    const { title, questions, settings, description } = JSON.parse(req.body.form_data);
    if (!title || !questions || !settings) return res.status(400).json({ message: 'Missing data' });
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    const foundUser = await User.findById(req.user);

    if (foundPoll.owner.id !== foundUser.id) return res.status(404).json({ message: `Unable to edit` });
    if (foundPoll.answers.length > 0 && !foundUser.admin) return res.status(409).json({ message: 'This poll has been answered already and can\'t be edited' });

    const polls = await Poll.find({ "owner.id": req.user });
    const pollExist = polls.find(poll => poll.title === title && poll.id !== foundPoll.id);
    if (pollExist) return res.status(409).json({ message: `A poll with title '${title}' already exists` });

    let { delete_image, old_image_path } = req.body;

    try {
        foundPoll.title = title;
        foundPoll.description = description;
        foundPoll.questions = questions;
        foundPoll.settings = settings;

        if (req.files) {
            const file = Object.values(req.files)[0];
            const fileName = foundPoll.id;
            const extName = path.extname(file.name);
            const fullFileName = `${fileName}${extName}`;
            const filePath = path.join(__dirname, '..', 'public', 'polls_pics', fullFileName);
            const pollFilePath = `/polls_pics/${fullFileName}`;
            await file.mv(filePath, async (err) => {
                if (err) {
                    logToDB({
                        poll_id: foundPoll.id,
                        poll_title: foundPoll.title,
                        log_message: `unable to upload poll image`,
                        log_type: 'polls'
                    }, true);
                }
            });
            logToDB({
                poll_id: foundPoll.id,
                poll_title: foundPoll.title,
                log_message: `poll image uploaded`,
                log_type: 'polls'
            }, false);
            foundPoll.image_path = pollFilePath;
        }

        if (delete_image === 'true' || (old_image_path.length > 0 && old_image_path !== foundPoll.image_path)) {
            const fullPath = path.join(__dirname, '../public', old_image_path);
            fs.unlink(fullPath, async (err) => {
                if (err) {
                    console.log(err);
                    console.log(old_image_path);
                    logToDB({
                        poll_id: foundPoll.id,
                        poll_title: foundPoll.title,
                        log_message: `unable to delete poll image`,
                        log_type: 'polls'
                    }, true);
                };
                logToDB({
                    poll_id: foundPoll.id,
                    poll_title: foundPoll.title,
                    log_message: `poll image removed`,
                    log_type: 'polls'
                }, false);
            });
        }

        if (delete_image === 'true') {
            foundPoll.image_path = '';
        }

        await foundPoll.save();
        res.status(200).json({
            message: `poll '${foundPoll.id}' has been editted`,
            poll: foundPoll
        });

    } catch (err) {
        res.status(500).json({ message: err.errors });
    }
}

const handleAnswerPoll = async (req, res) => {
    const { data, pollId } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });
    if (!data) return res.status(400).json({ message: 'Missing answers data' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });
    if (foundPoll.owner.id === req.user) return res.status(409).json({ message: 'You\'re not allowed to answer your own poll' });

    const foundUser = await User.findById(req.user);
    if (foundUser.polls_answered.includes(pollId)) return res.status(409).json({ message: 'You already answered this poll' });

    let null_counter = 0;
    data.answers.forEach(answer => {
        if (typeof answer.value === 'object') {
            if (Array.isArray(answer.value) && answer.value.length > 0) {
                const new_values_arr = {};
                answer.value.forEach((value) => {
                    const parsedValue = JSON.parse(value);
                    if (parsedValue) {
                        new_values_arr[parsedValue.original_index] = parsedValue;
                    }
                })
                answer.value = new_values_arr;
            }
        } else if (typeof answer.value === 'string') {
            try {
                answer.value = JSON.parse(answer.value);
            } catch {
                if (answer.value.length === 0) {
                    answer.value = null;
                }
            }
        }
        if (answer.value === null) {
            null_counter++;
        }
    });

    try {
        if (null_counter !== data.answers.length) {
            foundPoll.answers.push(data);
            await foundPoll.save();
        } else {
            throw new Error('Please answer atleast 1 question');
        }

        foundUser.polls_answered.push(pollId);
        foundUser.polls_visited = foundUser.polls_visited.filter(poll => poll !== pollId);

        await foundUser.save();

        res.json({ message: 'success' });
        logToDB({
            poll_id: foundPoll.id,
            poll_title: foundPoll.title,
            log_message: `poll answered by ${foundUser.username}`,
            log_type: 'polls'
        }, false);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}

const handleSearchPolls = async (req, res) => {
    const { searchValue } = req.body;
    if (!searchValue) return res.status(204).json({ message: 'Missing Title or ID' });

    const select = 'owner.username title image_path creation_date creation_time';
    let searchResults = await Poll.find({ _id: searchValue }).select(select);
    if (searchResults.length === 0) {
        searchResults = await Poll.find({ title: { $regex: searchValue, $options: 'i' } }).select(select);
    }

    res.json({ searchResults });
}

const handleGetPollAnswers = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    const userAnswers = foundPoll.answers?.find(answer => answer.answered_by.user_id === req.user)?.answers;
    if (!userAnswers) return res.sendStatus(204);

    res.json({ userAnswers });
}

const handleGetPollById = async (req, res) => {
    const { id } = req.params;
    const { include_answers } = req.query;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const selectString = (include_answers === 'true')
        ? 'owner title description image_path creation_date questions settings answers'
        : 'owner title description image_path creation_date questions settings';
    const foundPoll = await Poll.findById(id).select(selectString);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    res.status(200).json({ foundPoll });
}

const handleVisitPoll = async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(id).select('-_id owner.id answers');
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    const foundUser = await User.findById(req.user);

    if (!foundUser.polls_answered.includes(id) && foundPoll.answers.find(answer => answer.answered_by.user_id === foundUser.id)) {
        foundUser.polls_answered.push(id);
        await foundUser.save();
        return res.sendStatus(200);
    };

    if (!foundUser.polls_answered.includes(id) && !foundUser.polls_visited.includes(id)) {
        foundUser.polls_visited.push(id);
        await foundUser.save();
    }

    res.sendStatus(200);

}

export default {
    handlePollCreate,
    handlePollDelete,
    handlePollEdit,
    handleAnswerPoll,
    handleSearchPolls,
    handleGetPollAnswers,
    handleGetPollById,
    handleVisitPoll,
}