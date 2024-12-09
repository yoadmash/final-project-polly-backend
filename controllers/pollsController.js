import { UploadClient } from "@uploadcare/upload-client";
import { deleteFile, UploadcareSimpleAuthSchema } from "@uploadcare/rest-client";
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { logToDB } from '../utils/log.js';
import { Poll } from "../model/Poll.js";
import { User } from "../model/User.js";
import { PollTemplate } from "../model/PollTemplate.js";

const handleGetTemplates = async (req, res) => {
    const { get_hidden, with_fields } = req.query;
    const templates = await PollTemplate.find((get_hidden === 'true') ? { "show": { $ne: null } } : { "show": true }).select((with_fields === 'true') ? '+fields' : '-fields');
    res.json({ templates });
}

const handleGetTemplateById = async (req, res) => {
    const { id } = req.params;

    const template = await PollTemplate.findById(id).select('-show');
    if (!template) return res.status(404).json({ message: "Template not found" });

    res.json({ template });
}

const handleCreateTemplate = async (req, res) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ message: 'Missing data' });

    const duplicate = await PollTemplate.findOne({ "title": data.title });
    if (duplicate) return res.status(409).json({ message: 'A template with this title already exists' });

    try {
        const newTemplate = await PollTemplate.create({ _id: uuid(), ...data });
        res.status(200).json({ message: 'Template created' });

        logToDB({
            template_id: newTemplate.id,
            template_title: newTemplate.title,
            log_type: 'templates',
            log_message: `created`,
        }, false);

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ message: "Something went wrong while trying to create this template" });
    }
}

const handleEditTemplate = async (req, res) => {
    const { id } = req.params;
    const { data } = req.body;
    if (!id || !data) return res.status(400).json({ message: 'Missing id or data' });

    try {
        const template = await PollTemplate.findById(id).select('+fields');
        template.title = data.title;
        template.fields = data.fields;
        await template.save();
        res.status(200).json({ message: 'Template editted' });

        logToDB({
            template_id: template.id,
            template_title: template.title,
            log_type: 'templates',
            log_message: `editted`,
        }, false);
    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ message: "Something went wrong while trying to edit this template" });
    }
}

const handleDeleteTemplate = async (req, res) => {
    const { id } = req.query;

    const template = await PollTemplate.findById(id);
    if (!template) return res.status(404).json({ message: "Template not found" });

    try {
        await PollTemplate.deleteOne({ _id: id });
        res.sendStatus(200);

        logToDB({
            template_id: template.id,
            template_title: template.title,
            log_type: 'templates',
            log_message: `deleted`,
        }, false);
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: 'Please try again' });
    }
}

const handleShowOrHideTemplate = async (req, res) => {
    const { id, showStatus } = req.body

    const template = await PollTemplate.findById(id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    try {
        template.show = showStatus;
        await template.save();
        res.sendStatus(200);

        logToDB({
            template_id: template._id,
            template_title: template.title,
            log_type: 'templates',
            log_message: (template.show) ? 'show' : 'hide',
        }, false);
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: 'Please try again' });
    }
}

const handlePollCreate = async (req, res) => {
    const { title, questions, settings, description } = JSON.parse(req.body.form_data);
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
            creation_date: format(Date.now(), 'dd/MM/yyyy'),
            creation_time: format(Date.now(), 'HH:mm:ss'),
            questions: questions,
            settings: settings
        });

        const user = await User.findById(req.user);
        user.polls_created.push(newPoll.id);
        user.save();

        logToDB({
            poll_id: newPoll.id,
            poll_title: newPoll.title,
            log_type: 'polls',
            log_message: `new poll created by ${foundUser.username}`,
        }, false);

        if (req.files) {
            const client = new UploadClient({ publicKey: process.env.IMG_SERVICE_KEY });
            const fileToUpload = Object.values(req.files)[0].data;
            const createdPoll = await Poll.findById(newPoll?.id);
            if (createdPoll) {
                const file = await client.uploadFile(fileToUpload, { fileName: createdPoll.id });
                if (!file?.cdnUrl || !file?.uuid) {
                    logToDB({
                        poll_id: createdPoll.id,
                        poll_title: createdPoll.title,
                        log_message: `unable to upload poll image`,
                        log_type: 'polls'
                    }, true);
                } else {
                    createdPoll.image_path = file.cdnUrl + '-/preview/';
                    createdPoll.image_uuid = file.uuid;
                    await createdPoll.save();
                }
            }
        }

        res.status(201).json({
            message: 'Poll created',
            poll: newPoll
        });

    } catch (err) {
        console.log(err.message);
        return res.status(500).json({ message: "Something went wrong while trying to create this poll" });
    }
}

const handlePollDelete = async (req, res) => {
    const { by_admin } = req.query;
    const { pollId } = req.body;
    if (!pollId) return res.status(400).json({ message: 'Missing poll id' });

    const adminUser = await User.findById(req.user);
    if (by_admin && !adminUser.admin) return res.status(404).json({ message: 'You are not an admin' });

    const foundPoll = await Poll.findById(pollId);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${pollId}` });

    const foundUser = await User.findById(by_admin && adminUser.admin ? foundPoll.owner.id : req.user);
    if (!foundUser) return res.status(404).json({ message: 'User not found' });

    if (foundPoll.owner.id !== req.user && !by_admin) { // removes poll from answered or visited
        const answered = foundUser.polls_answered.includes(pollId);
        const visited = foundUser.polls_visited.includes(pollId);

        if (answered) {
            foundUser.polls_answered = foundUser.polls_answered.filter(poll => poll !== pollId);
            // const answer_exists = foundPoll.answers.find(answer => answer.answered_by.user_id === foundUser.id);
            // if (answer_exists && foundPoll.settings.usersCanDeleteAnswer) { // removes the answer from the poll itself
            //     foundPoll.answers = foundPoll.answers.filter(answer => answer.answered_by.user_id !== foundUser.id);
            //     await foundPoll.save();
            //     logToDB({
            //         poll_id: foundPoll.id,
            //         poll_title: foundPoll.title,
            //         log_message: `${foundUser.username} deleted his answer`,
            //         log_type: 'polls'
            //     }, false);
            // }
        }

        if (visited) {
            foundUser.polls_visited = foundUser.polls_visited.filter(poll => poll !== pollId);
        }

        await foundUser.save();
        return res.sendStatus(200);
    }

    if (foundPoll.image_path?.length > 0 && foundPoll.image_uuid?.length > 0) {
        try {
            await deleteFile({ uuid: foundPoll.image_uuid }, {
                authSchema: new UploadcareSimpleAuthSchema({
                    publicKey: process.env.IMG_SERVICE_KEY,
                    secretKey: process.env.IMG_SERVICE_SECRET,
                })
            });
            foundPoll.image_path = '';
            foundPoll.image_uuid = '';
            await foundPoll.save();
        } catch (err) {
            console.log(err.message);
            logToDB({
                poll_id: foundPoll.id,
                poll_title: foundPoll.title,
                log_message: `unable to delete poll image`,
                log_type: 'polls'
            }, true);
        }
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
                const updatedPollsAnswered = foundUserAnswered.polls_answered.filter(poll => poll !== pollId);
                foundUserAnswered.polls_answered = updatedPollsAnswered;
                try {
                    await foundUserAnswered.save();
                } catch (err) {
                    logToDB({
                        poll_id: foundPoll.id,
                        poll_title: foundPoll.title,
                        log_message: `unable to delete poll from\npoll_answered of user: ${user.user_name} (${user.user_id})`,
                        log_type: 'polls'
                    }, true);
                }
            }
        });
    }

    try {
        await Poll.deleteOne({ _id: foundPoll.id });
        await User.updateOne({ _id: foundUser.id }, { polls_created: updatedUserPolls });
        res.status(200).json({ message: `'${foundPoll.title}' has been deleted` });
        logToDB({
            poll_id: foundPoll.id,
            poll_title: foundPoll.title,
            log_message: `poll deleted by ${by_admin ? 'admin ' + adminUser.username : foundUser.username}`,
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

    if (foundPoll.owner.id !== foundUser.id && !foundUser.admin) return res.status(404).json({ message: `Unable to edit` });
    if (foundPoll.answers.length > 0 && !foundUser.admin) return res.status(409).json({ message: 'This poll has been answered already and can\'t be edited' });

    const polls = await Poll.find({ "owner.id": req.user });
    const pollExist = polls.find(poll => poll.title === title && poll.id !== foundPoll.id);
    if (pollExist) return res.status(409).json({ message: `A poll with title '${title}' already exists` });

    let { delete_image, old_image } = req.body;

    try {
        foundPoll.title = title;
        foundPoll.description = description;
        foundPoll.questions = questions;
        foundPoll.settings = settings;

        if (req.files) {
            const client = new UploadClient({ publicKey: process.env.IMG_SERVICE_KEY });
            const fileToUpload = Object.values(req.files)[0].data;
            const file = await client.uploadFile(fileToUpload, { fileName: foundPoll.id });
            if (!file?.cdnUrl || !file?.uuid) {
                logToDB({
                    poll_id: foundPoll.id,
                    poll_title: foundPoll.title,
                    log_message: `unable to upload poll image`,
                    log_type: 'polls'
                }, true);
            } else {
                foundPoll.image_path = file.cdnUrl + '-/preview/';
                foundPoll.image_uuid = file.uuid;
                await foundPoll.save();
                logToDB({
                    poll_id: foundPoll.id,
                    poll_title: foundPoll.title,
                    log_message: `poll image changed`,
                    log_type: 'polls'
                }, false);
            }
        }

        if (delete_image === 'true' || (old_image.length > 0 && old_image !== foundPoll.image_uuid)) {
            await deleteFile({ uuid: old_image }, {
                authSchema: new UploadcareSimpleAuthSchema({
                    publicKey: process.env.IMG_SERVICE_KEY,
                    secretKey: process.env.IMG_SERVICE_SECRET,
                })
            });
        }

        if (delete_image === 'true') {
            foundPoll.image_path = '';
            foundPoll.image_uuid = '';
        }

        await foundPoll.save();
        res.status(200).json({
            message: `poll '${foundPoll.id}' has been editted`,
            poll: foundPoll
        });

    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: "Something went wrong while trying to edit this poll" });
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
                if (typeof answer.value === 'number') {
                    answer.value = String(answer.value);
                }
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

        if (!foundPoll.settings.submitAnonymously) {
            foundUser.polls_answered.push(pollId);
            foundUser.polls_visited = foundUser.polls_visited.filter(poll => poll !== pollId);
        }

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

    const foundUserPolls = await User.findById(req.user).select('-_id polls_created polls_answered polls_visited');
    if (!foundUserPolls) return res.status(404).json({ message: 'User not found' });

    const pollsIdsCombined = Array.from(
        new Set([
            ...foundUserPolls?.polls_created,
            ...foundUserPolls?.polls_answered,
            ...foundUserPolls?.polls_visited
        ])
    );

    const select = 'owner.username title image_path creation_date creation_time';
    const searchResults = await Poll.find({
        "_id": {
            $in: pollsIdsCombined
        },
        "title": {
            $regex: searchValue, $options: 'i'
        },
    }).select(select);

    res.json({ searchResults });
}

const handleGetPollAnswers = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    const userAnswers = foundPoll.answers?.find(answer => answer.answered_by.user_id === req.user)?.answers;
    if (!userAnswers) return res.sendStatus(204);

    const userInfo = foundPoll.answers.find(answer => answer.answered_by.user_id === req.user).answered_by;

    res.json({ userAnswers, userInfo });
}

const handleClearPollAnswers = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    if (foundPoll.answers.length > 0) {

        const usersAnswered = [];
        foundPoll.answers.forEach(answer => {
            usersAnswered.push(answer.answered_by);
        });

        if (usersAnswered.length > 0) {
            usersAnswered.forEach(async (user) => {
                const foundUserAnswered = await User.findById(user.user_id);
                if (foundUserAnswered) {
                    const updatedPollsAnswerd = foundUserAnswered.polls_answered.filter(poll => poll !== id);
                    foundUserAnswered.polls_answered = updatedPollsAnswerd;
                    try {
                        await foundUserAnswered.save();
                    } catch (err) {
                        console.log(err.message);
                        // logToDB({
                        //     poll_id: foundPoll.id,
                        //     poll_title: foundPoll.title,
                        //     log_message: `unable to delete poll from\npoll_answered of user: ${user.user_name} (${user.user_id})`,
                        //     log_type: 'polls'
                        // }, true);
                    }
                }
            });
        }

        try {
            foundPoll.answers = [];
            await foundPoll.save();
        } catch (err) {
            console.log(err.message)
        }
    }

    res.sendStatus(200);
}

const handleGetPollById = async (req, res) => {
    const { id } = req.params;
    const { include_answers, card_data_only } = req.query;
    if (!id) return res.status(400).json({ message: 'Missing poll id' });

    let selectString = '';

    if (include_answers) {
        selectString = 'owner title description image_path image_uuid creation_date questions settings answers';
    } else if (card_data_only) {
        selectString = 'owner title image_path creation_date creation_time';
    } else {
        selectString = 'owner title description image_path image_uuid creation_date questions settings';
    }


    const foundPoll = await Poll.findById(id).select(selectString);
    if (!foundPoll) return res.status(404).json({ message: `No poll matches id: ${id}` });

    res.status(200).json({ foundPoll });
}

const handleGetAllPolls = async (req, res) => {
    const foundUser = await User.findById(req.user);
    if (!foundUser.admin) return res.sendStatus(401);

    const allPolls = await Poll.find().select('_id title owner image_path creation_date creation_time answers settings');
    const allPollsFormatted = JSON.parse(JSON.stringify(allPolls));
    allPollsFormatted.map(poll => {
        poll.answers = poll.answers.length;
        poll.creation_datetime = `${poll.creation_date}, ${poll.creation_time}`;
        delete poll.creation_date;
        delete poll.creation_time;
    });
    res.status(200).json({ allPollsFormatted });
}

const handleChangeOwner = async (req, res) => {
    const { id } = req.params;
    const { new_owner } = req.body;

    const foundUser = await User.findById(req.user);
    if (!foundUser.admin) return res.sendStatus(401);

    const foundPoll = await Poll.findById(id);
    if (!foundPoll) return res.status(404).json({ message: 'Poll not found' });
    if (foundPoll.owner.id === new_owner.id) return res.sendStatus(204);

    const newOwner = await User.findById(new_owner.id);
    const oldOwner = await User.findById(foundPoll.owner.id);
    if (!newOwner || !oldOwner) return res.status(404).json({ message: 'User not found' });

    try {
        foundPoll.owner = new_owner;
        await foundPoll.save();

        oldOwner.polls_created = oldOwner.polls_created.filter(poll => poll !== id);
        await oldOwner.save();

        newOwner.polls_created.push(id);
        newOwner.save();

        res.sendStatus(200);
    } catch (err) {
        console.log(err.message);
        res.status(500).json({ message: 'Unable to change owner' });
    }
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
    handleGetTemplates,
    handleGetTemplateById,
    handleCreateTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleShowOrHideTemplate,
    handlePollCreate,
    handlePollDelete,
    handlePollEdit,
    handleAnswerPoll,
    handleSearchPolls,
    handleGetPollAnswers,
    handleClearPollAnswers,
    handleGetPollById,
    handleGetAllPolls,
    handleChangeOwner,
    handleVisitPoll,
}