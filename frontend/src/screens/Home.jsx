import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import axios from "../config/axios";
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { user } = useContext(UserContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState([]);
  const navigate = useNavigate();

  const createProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/projects/create', { name: projectName });
      setProject([...project, res.data.project]); // Add new project instantly
      setIsModalOpen(false);
      setProjectName('');
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    axios
      .get('/projects/all')
      .then((res) => setProject(res.data.projects))
      .catch((err) => console.log(err));
  }, []);

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Projects</h1>
          <p className="text-gray-500 mt-1">Create, view, and manage your projects in one place.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center border-2 border-dashed border-blue-400 bg-white hover:bg-blue-50 text-blue-600 rounded-xl p-6 transition-all"
          >
            <i className="ri-add-line text-3xl mb-2"></i>
            <span className="font-semibold text-lg">Create New Project</span>
          </button>

          {project.map((proj) => (
            <div
              key={proj._id}
              onClick={() => navigate(`/project`, { state: { project: proj } })}
              className="bg-white rounded-xl shadow-sm hover:shadow-md p-5 cursor-pointer transition-all border border-gray-200"
            >
              <h2 className="text-lg font-bold text-gray-800 truncate">{proj.name}</h2>
              <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <i className="ri-user-line"></i>
                {proj.users.length} Collaborators
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Project</h2>
            <form onSubmit={createProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter your project name"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
