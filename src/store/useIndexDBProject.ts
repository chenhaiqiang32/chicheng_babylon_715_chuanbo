import { defineStore } from 'pinia';
import { ref, shallowRef, toRaw } from 'vue';
interface Project {
  name: string;
  time: string;
}
export const useIndexDBProject = defineStore('indexDBProject', () => {
  const projects = ref<Project[]>([]);

  const json = localStorage.getItem('projects');
  if (json) {
    projects.value = JSON.parse(json);
  }
  projects.value = projects.value.sort((a, b) => {
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });

  async function addProject(project: Project) {
    const find = projects.value.find((p) => p.name === project.name);
    if (find) {
      find.time = project.time;
    } else {
      projects.value.push(project);
    }
    projects.value = projects.value.sort((a, b) => {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    localStorage.setItem('projects', JSON.stringify(toRaw(projects.value)));
  }
  function exit(name: string) {
    return projects.value.find((p) => p.name === name);
  }

  return {
    exit,
    addProject,
    projects,
  };
});
