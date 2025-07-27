// Import statements
import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer.js'

function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current)
            ref.current.removeAttribute('data-highlighted')
        }
    }, [props.className, props.children])

    return <code {...props} ref={ref} />
}

const Project = () => {
    const location = useLocation()
    const { user } = useContext(UserContext)
    const messageBox = useRef(null)

    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [project, setProject] = useState(location.state.project)
    const [message, setMessage] = useState('')
    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [fileTree, setFileTree] = useState({})
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [webContainer, setWebContainer] = useState(null)
    const [iframeUrl, setIframeUrl] = useState(null)
    const [runProcess, setRunProcess] = useState(null)

    const handleUserClick = (id) => {
        setSelectedUserId(prev => {
            const newSet = new Set(prev)
            newSet.has(id) ? newSet.delete(id) : newSet.add(id)
            return newSet
        })
    }

    const addCollaborators = () => {
        axios.put("/projects/add-user", {
            projectId: project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            setIsModalOpen(false)
        }).catch(console.log)
    }

    const send = () => {
        sendMessage('project-message', { message, sender: user })
        setMessages(prev => [...prev, { sender: user, message }])
        setMessage("")
    }

  const WriteAiMessage = (message) => {
    let messageObject = { text: "Invalid message format." }

    try {
        messageObject = JSON.parse(message)
    } catch (error) {
        console.error("Failed to parse AI message:", message)
    }

    return (
        <div className='overflow-auto bg-gray-800 text-white rounded-md p-2'>
            <Markdown
                children={messageObject.text}
                options={{ overrides: { code: SyntaxHighlightedCode } }}
            />
        </div>
    )
}

    const saveFileTree = (ft) => {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).catch(console.log)
    }

    useEffect(() => {
        initializeSocket(project._id)
        if (!webContainer) {
            getWebContainer().then(setWebContainer)
        }

        receiveMessage('project-message', (data) => {
            const isAI = data.sender._id === 'ai'
            const parsed = isAI ? JSON.parse(data.message) : null

            if (isAI && parsed?.fileTree) {
                webContainer?.mount(parsed.fileTree)
                setFileTree(parsed.fileTree)
            }

            setMessages(prev => [...prev, data])
        })

        axios.get(`/projects/get-project/${project._id}`).then(res => {
            setProject(res.data.project)
            setFileTree(res.data.project.fileTree || {})
        }).catch(console.log)

        axios.get('/users/all').then(res => setUsers(res.data.users)).catch(console.log)
    }, [])

    return (
        <main className="h-screen w-screen flex font-sans">
            {/* Sidebar */}
            <section className="w-96 bg-gray-100 flex flex-col relative">
                <header className="p-4 bg-white shadow flex justify-between items-center">
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 text-blue-600 hover:underline">
                        <i className="ri-add-fill" />
                        Add Collaborator
                    </button>
                    <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}>
                        <i className="ri-group-fill text-xl" />
                    </button>
                </header>

                {/* Chat Messages */}
                <div ref={messageBox} className="flex-grow overflow-y-auto px-3 py-4 space-y-2">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`p-3 rounded-md shadow max-w-[80%] ${msg.sender._id === 'ai' ? 'bg-gray-900 text-white' : 'bg-white'} ${msg.sender._id === user._id ? 'ml-auto' : ''}`}
                        >
                            <small className="block text-xs mb-1 text-gray-500">{msg.sender.email}</small>
                            <div className="text-sm">
                                {msg.sender._id === 'ai' ? WriteAiMessage(msg.message) : <p>{msg.message}</p>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t flex gap-2">
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-grow border px-4 py-2 rounded-md"
                        placeholder="Enter message"
                    />
                    <button onClick={send} className="bg-blue-600 text-white px-4 py-2 rounded-md">
                        <i className="ri-send-plane-fill" />
                    </button>
                </div>

                {/* Side Panel (Collaborators) */}
                <div className={`absolute top-0 left-0 h-full w-full bg-white transition-transform duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} shadow-lg z-20`}>
                    <header className="p-4 flex justify-between items-center border-b">
                        <h2 className="text-lg font-semibold">Collaborators</h2>
                        <button onClick={() => setIsSidePanelOpen(false)}><i className="ri-close-line text-xl" /></button>
                    </header>
                    <div className="p-4 space-y-3 overflow-auto">
                        {project.users?.map(u => (
                            <div key={u._id} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">
                                    <i className="ri-user-fill" />
                                </div>
                                <span>{u.email}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Code Editor Section */}
            <section className="flex-grow bg-gray-50 flex">
                {/* File Tree */}
                <aside className="w-60 bg-gray-200 border-r">
                    <div className="p-4">
                        {Object.keys(fileTree).map((file, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setCurrentFile(file)
                                    setOpenFiles([...new Set([ ...openFiles, file ])])
                                }}
                                className="block w-full text-left px-2 py-1 rounded hover:bg-gray-300"
                            >
                                {file}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Code Editor and Iframe */}
                <div className="flex-grow flex flex-col">
                    {/* Open File Tabs */}
                    <div className="flex bg-gray-100 border-b overflow-x-auto">
                        {openFiles.map((file, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentFile(file)}
                                className={`px-4 py-2 ${file === currentFile ? 'bg-gray-300' : ''}`}
                            >
                                {file}
                            </button>
                        ))}
                        <button
                            onClick={async () => {
                                await webContainer.mount(fileTree)
                                await webContainer.spawn("npm", ["install"])
                                if (runProcess) runProcess.kill()
                                const process = await webContainer.spawn("npm", ["start"])
                                setRunProcess(process)
                                process.output.pipeTo(new WritableStream({
                                    write: chunk => console.log(chunk)
                                }))
                                webContainer.on("server-ready", (port, url) => setIframeUrl(url))
                            }}
                            className="ml-auto px-4 py-2 bg-blue-600 text-white"
                        >
                            Run
                        </button>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-grow overflow-auto p-4">
                        {fileTree[currentFile] && (
                            <pre className="bg-white p-4 rounded-md overflow-auto">
                                <code
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                        const updated = e.target.innerText
                                        const updatedTree = {
                                            ...fileTree,
                                            [currentFile]: {
                                                file: { contents: updated }
                                            }
                                        }
                                        setFileTree(updatedTree)
                                        saveFileTree(updatedTree)
                                    }}
                                    dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value }}
                                />
                            </pre>
                        )}
                    </div>
                </div>

                {/* Iframe */}
                {iframeUrl && (
                    <div className="w-[400px] border-l flex flex-col">
                        <input
                            type="text"
                            value={iframeUrl}
                            onChange={(e) => setIframeUrl(e.target.value)}
                            className="p-2 bg-gray-200"
                        />
                        <iframe src={iframeUrl} className="flex-grow" title="Live Preview" />
                    </div>
                )}
            </section>

            {/* Collaborator Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-md w-[400px] max-w-full space-y-4">
                        <header className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">Add Collaborators</h2>
                            <button onClick={() => setIsModalOpen(false)}><i className="ri-close-line text-xl" /></button>
                        </header>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {users.map(u => (
                                <div
                                    key={u._id}
                                    onClick={() => handleUserClick(u._id)}
                                    className={`p-2 flex items-center gap-3 rounded cursor-pointer ${selectedUserId.has(u._id) ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                                >
                                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">
                                        <i className="ri-user-fill" />
                                    </div>
                                    <span>{u.email}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className="w-full py-2 bg-blue-600 text-white rounded-md"
                        >
                            Add Selected
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project

