const jianzhen = {
  name: '减震系统',
  uuid: '277a1b9e-ad4c-4e64-8166-ab01a0c76738',
  clips: [
    {
      name: '车壳%isVisible',
      uuid: '257b2791-868c-494d-89bf-1151de00affb',
      objectUuid: 'de2eae96-475e-45b6-a793-b6a729ee2d3f',
      property: 'isVisible',
      type: 'boolean',
      key: [
        {
          time: 0.425,
          value: false,
        },
      ],
    },
    {
      name: '减震%position',
      uuid: '2399420a-e4a1-4ff9-98af-e8305cbe45de',
      objectUuid: '9b6a89d7-f369-4bf0-b40b-76e769bb32af',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 0.425,
          value: [0.0014144610613584518, 0.5240472555160522, 0.10043548047542572],
        },
        {
          time: 0.825,
          value: [0.0014144610613584518, 1.5219882726669312, 0.10043548047542572],
        },
      ],
    },
    {
      name: '减震弹簧顶部_primitive1%position',
      uuid: 'bc297b28-8d85-4881-8873-cb91abd4b9d6',
      objectUuid: '385bc55a-6dad-4292-931b-77aba646f71c',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, 0.6852014064788818, 0],
        },
      ],
    },
    {
      name: '减震_primitive0%position',
      uuid: 'c5605bb3-ce2e-47c6-8126-434647c5f94f',
      objectUuid: 'd0fa52d7-1e7e-4528-9941-cc65947d4688',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, -0.46399199962615967, 0],
        },
      ],
    },
    {
      name: '减震_primitive1%position',
      uuid: 'bb203682-8d1f-4d7f-a11d-e7fe2fde9da3',
      objectUuid: '7f17bfaa-3d74-4ea0-85a8-bc1a6d522d56',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, 0.37868309020996094, 0],
        },
      ],
    },
    {
      name: '减震_primitive3%position',
      uuid: 'fcf309f2-2080-4266-a6ec-0509e05c5fe8',
      objectUuid: '9972708b-4f34-4dc5-82cc-215af8335113',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0, 0, 0],
        },
        {
          time: 2,
          value: [0, 0, 0.34255731105804443],
        },
      ],
    },
    {
      name: '减震橡胶%position',
      uuid: '46180722-91fc-4082-8364-8a4c81ac738d',
      objectUuid: '91217019-02cd-4d4e-9632-82c702a58ae7',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0.015248866751790047, 0.16572046279907227, 0.0065057724714279175],
        },
        {
          time: 2,
          value: [0.015248866751790047, 0.32667338848114014, 0.0065057724714279175],
        },
      ],
    },
    {
      name: '悬挂弹簧%position',
      uuid: 'b53daeea-0274-43e6-92f7-a11ef94a4ef3',
      objectUuid: '537bc908-0662-4d98-86a5-3a4a3d5ca33b',
      property: 'position',
      type: 'v3',
      key: [
        {
          time: 1.025,
          value: [0.015248861163854599, 0.188673198223114, 0.004654139280319214],
        },
        {
          time: 2,
          value: [0.015248861163854599, 0.0017279386520385742, 0.004654139280319214],
        },
      ],
    },
  ],
};

window.addEventListener('message', (data) => {
  if (data.data?.type === 'disassemble') {
    console.log(data.data?.data);
  } else if (data.data?.type === 'focus') {
    console.log(data.data?.data);
  }
});
