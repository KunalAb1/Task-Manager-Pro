const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "tasks.json");

function readTasks() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: [] }));
    }
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data).tasks;
}

function saveTasks(tasks) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks }, null, 2));
}

app.get("/", function(req, res) {
    res.send("Task Manager Running");
});

// Add task
app.post("/tasks", function(req, res) {
    const { task, dueDate, priority } = req.body;

    if (!task) {
        return res.status(400).json({ error: "Task is required" });
    }

    const tasks = readTasks();
    tasks.push({
        text: task,
        completed: false,
        dueDate: dueDate || null,
        priority: priority || "medium" // ✅ default to medium
    });
    saveTasks(tasks);

    res.json({ message: "Task added", tasks });
});

// Get all tasks
app.get("/tasks", function(req, res) {
    const tasks = readTasks();
    res.json({ tasks });
});

// Delete task
app.delete("/tasks/:index", function(req, res) {
    const index = parseInt(req.params.index);
    const tasks = readTasks();

    if (index >= tasks.length || index < 0) {
        return res.status(400).json({ error: "Task not found" });
    }

    tasks.splice(index, 1);
    saveTasks(tasks);

    res.json({ message: "Task Deleted", tasks });
});

// Update task
app.put("/tasks/:index", function(req, res) {
    const index = parseInt(req.params.index);
    const { task, dueDate, priority } = req.body;
    const tasks = readTasks();

    if (index >= tasks.length || index < 0) {
        return res.status(400).json({ error: "Task not found" });
    }

    if (!task) {
        return res.status(400).json({ error: "New task is required" });
    }

    tasks[index].text = task;
    tasks[index].dueDate = dueDate || null;
    tasks[index].priority = priority || "medium"; // ✅ update priority too
    saveTasks(tasks);

    res.json({ message: "Task Updated", tasks });
});

// Toggle completion
app.patch("/tasks/:index/toggle", function(req, res) {
    const index = parseInt(req.params.index);
    const tasks = readTasks();

    if (index >= tasks.length || index < 0) {
        return res.status(400).json({ error: "Task not found" });
    }

    tasks[index].completed = !tasks[index].completed;
    saveTasks(tasks);

    res.json({ message: "Task toggled", tasks });
});

app.listen(3000, function() {
    console.log("Server is running on port 3000");
});