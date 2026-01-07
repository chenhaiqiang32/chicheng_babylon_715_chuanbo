import { defineStore } from 'pinia';
import { ref, shallowRef, toRaw } from 'vue';
interface Project {
  name: string;
  time: string;
  type: 'local' | 'net';
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
    const find = projects.value.find((p) => p.name === project.name && p.type === project.type);
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

  function deleteProject(name: string) {
    projects.value = projects.value.filter((p) => p.name !== name);
    deleteEntireDatabaseSafely(name);
    localStorage.setItem('projects', JSON.stringify(toRaw(projects.value)));
  }

  return {
    exit,
    addProject,
    deleteProject,
    projects,
  };
});

function deleteEntireDatabaseSafely(dbName: string) {
  // 先尝试打开并立即关闭，释放连接
  const openRequest = indexedDB.open(dbName);

  openRequest.onsuccess = (event) => {
    //@ts-ignore
    const db = event.target.result as IDBDatabase;
    db.close(); // 关闭连接

    // 再删除
    const deleteRequest = indexedDB.deleteDatabase(dbName);
    deleteRequest.onsuccess = () => console.log(`数据库 "${dbName}" 删除成功`);
    deleteRequest.onerror = (e) => console.error('删除失败:', e.target);
    deleteRequest.onblocked = () => console.warn('删除被阻塞，请检查其他标签页');
  };

  openRequest.onerror = () => {
    indexedDB.deleteDatabase(dbName);
  };
}
