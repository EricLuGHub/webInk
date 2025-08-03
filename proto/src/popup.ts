export function sayHello() {
    alert('Hello from popup.ts!');
}

document.getElementById('btn')?.addEventListener('click', () => {
    sayHello();
});
