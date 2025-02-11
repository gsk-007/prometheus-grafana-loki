export const doSomeHeavyTask = async () => {
  return new Promise((resolve, reject) => {
    const time = Math.floor(Math.random() * 5);

    if (time < 2) {
      reject("sdfsdfsf");
    }

    setTimeout(() => {
      resolve(time * 1000);
    }, time * 1000);
  });
};
