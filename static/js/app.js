class ChecklistApp {
    constructor() {
        this.container = document.getElementById('container');
        this.callTypes = ["sales", "reengagement", "followup", "at-risk", "support", "introduction"];
        this.checklistOptions = ["voicemail", "start call"];
        this.currentCallType = null;
        this.currentChecklistType = null;
        this.objectionSubchecklistData = null;
        
        this.init();
    }

    async init() {
        await this.loadChecklists();
        this.showHomePage();
        this.setupKeyboardShortcuts();
    }

    async loadChecklists() {
        try {
            const response = await fetch('/api/checklists');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.checklists = await response.json();
            console.log('Loaded checklists:', this.checklists);
        } catch (error) {
            console.error('Error loading checklists:', error);
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Number keys 1-6 for call types
            if (e.key >= '1' && e.key <= '6' && this.container.querySelector('.call-type-buttons')) {
                const index = parseInt(e.key) - 1;
                if (index < this.callTypes.length) {
                    this.showCallSubMenu(this.callTypes[index]);
                }
            }
            
            // 'v' for voicemail, 's' for start call
            if (this.currentCallType && !this.currentChecklistType) {
                if (e.key.toLowerCase() === 'v') {
                    this.showChecklistPage(this.currentCallType, 'voicemail');
                } else if (e.key.toLowerCase() === 's') {
                    this.showChecklistPage(this.currentCallType, 'start call');
                }
            }
            
            // 'n' for new call
            if (e.key.toLowerCase() === 'n' && this.currentChecklistType) {
                this.newCall();
            }
        });
    }

    clearContainer() {
        this.container.innerHTML = '';
    }

    showHomePage() {
        this.clearContainer();
        this.currentCallType = null;
        this.currentChecklistType = null;
        
        const title = document.createElement('h1');
        title.className = 'title';
        title.textContent = 'Finish Your Checklist';
        
        const instruction = document.createElement('h2');
        instruction.className = 'subtitle';
        instruction.textContent = 'Select Call Type:';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'call-type-buttons';
        
        this.container.appendChild(title);
        this.container.appendChild(instruction);
        this.container.appendChild(buttonContainer);
        
        this.callTypes.forEach((ct, index) => {
            const displayName = ct === "at-risk" ? "At-Risk" : ct.charAt(0).toUpperCase() + ct.slice(1);
            const button = document.createElement('button');
            button.className = 'button';
            button.textContent = `${index + 1}. ${displayName} Call`;
            button.onclick = () => this.showCallSubMenu(ct);
            buttonContainer.appendChild(button);
        });
    }

    showCallSubMenu(callType) {
        this.clearContainer();
        this.currentCallType = callType;
        
        const title = document.createElement('h1');
        title.className = 'title';
        title.textContent = `${callType.charAt(0).toUpperCase() + callType.slice(1)} Call`;
        
        const instruction = document.createElement('h2');
        instruction.className = 'subtitle';
        instruction.textContent = 'Select an option:';
        
        this.container.appendChild(title);
        this.container.appendChild(instruction);
        
        const voicemailBtn = document.createElement('button');
        voicemailBtn.className = 'button';
        voicemailBtn.textContent = 'Voicemail (V)';
        voicemailBtn.onclick = () => this.showChecklistPage(callType, 'voicemail');
        
        const startCallBtn = document.createElement('button');
        startCallBtn.className = 'button';
        startCallBtn.textContent = 'Start Call (S)';
        startCallBtn.onclick = () => this.showChecklistPage(callType, 'start call');
        
        this.container.appendChild(voicemailBtn);
        this.container.appendChild(startCallBtn);
        
        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'button secondary';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => this.showHomePage();
        this.container.appendChild(backBtn);
    }

    async showChecklistPage(callType, checklistType) {
        this.clearContainer();
        this.currentCallType = callType;
        this.currentChecklistType = checklistType;
        
        const checklist = this.checklists.find(c => 
            c.call_type === callType && c.checklist_type === checklistType);
        
        if (!checklist) {
            console.error('Checklist not found:', { callType, checklistType, checklists: this.checklists });
            return;
        }
        
        console.log('Displaying checklist:', checklist);
        
        const title = document.createElement('h1');
        title.className = 'title';
        title.textContent = `${callType.charAt(0).toUpperCase() + callType.slice(1)} - ${checklistType.charAt(0).toUpperCase() + checklistType.slice(1)}`;
        
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks-container';
        
        this.container.appendChild(title);
        this.container.appendChild(tasksContainer);
        
        this.displayTasks(checklist, tasksContainer);
        
        // New Call button
        const newCallBtn = document.createElement('button');
        newCallBtn.className = 'button';
        newCallBtn.textContent = 'New Call (N)';
        newCallBtn.onclick = () => this.newCall();
        this.container.appendChild(newCallBtn);
        
        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'button secondary';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => this.showCallSubMenu(callType);
        this.container.appendChild(backBtn);
    }

    async displayTasks(checklist, container) {
        container.innerHTML = '';
        
        checklist.tasks.forEach((task, index) => {
            const taskRow = document.createElement('div');
            taskRow.className = 'task-row';
            
            const taskBtn = document.createElement('button');
            taskBtn.className = `button task-button ${task.done ? 'completed' : ''}`;
            taskBtn.textContent = task.text;
            
            if (task.text === 'Objection' && 
                ['sales', 'reengagement', 'support', 'at-risk'].includes(this.currentCallType) && 
                this.currentChecklistType === 'start call') {
                taskBtn.onclick = () => this.openObjectionSubchecklist();
            } else {
                taskBtn.onclick = () => this.toggleTask(checklist, index);
            }
            
            taskRow.appendChild(taskBtn);
            container.appendChild(taskRow);
            
            // Show objection subchecklist if applicable
            if (task.text === 'Objection' && this.objectionSubchecklistData) {
                this.renderObjectionSubchecklist(container);
            }
        });
    }

    async toggleTask(checklist, taskIndex) {
        checklist.tasks[taskIndex].done = !checklist.tasks[taskIndex].done;
        
        // Update the server
        await fetch(`/api/checklist/${this.currentCallType}/${this.currentChecklistType}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(checklist),
        });
        
        // Refresh the display
        this.displayTasks(checklist, this.container.querySelector('.tasks-container'));
    }

    openObjectionSubchecklist() {
        if (!this.objectionSubchecklistData) {
            this.objectionSubchecklistData = [
                {text: 'Listen & Acknowledge', done: false},
                {text: 'Clarify & Question', done: false},
                {text: 'Address the Objection', done: false},
                {text: 'Confirm & Close', done: false}
            ];
        }
        this.displayTasks(
            this.checklists.find(c => 
                c.call_type === this.currentCallType && 
                c.checklist_type === this.currentChecklistType),
            this.container.querySelector('.tasks-container')
        );
    }

    renderObjectionSubchecklist(container) {
        const subchecklistContainer = document.createElement('div');
        subchecklistContainer.className = 'objection-subchecklist';
        
        this.objectionSubchecklistData.forEach((item, index) => {
            const button = document.createElement('button');
            button.className = `button ${item.done ? 'completed' : ''}`;
            button.textContent = item.text;
            button.onclick = () => {
                item.done = !item.done;
                this.displayTasks(
                    this.checklists.find(c => 
                        c.call_type === this.currentCallType && 
                        c.checklist_type === this.currentChecklistType),
                    this.container.querySelector('.tasks-container')
                );
            };
            subchecklistContainer.appendChild(button);
        });
        
        container.appendChild(subchecklistContainer);
    }

    async newCall() {
        const checklist = this.checklists.find(c => 
            c.call_type === this.currentCallType && 
            c.checklist_type === this.currentChecklistType);
        
        if (checklist) {
            checklist.tasks.forEach(task => task.done = false);
            this.objectionSubchecklistData = null;
            
            // Update the server
            await fetch(`/api/checklist/${this.currentCallType}/${this.currentChecklistType}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checklist),
            });
        }
        
        this.showHomePage();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new ChecklistApp();
}); 