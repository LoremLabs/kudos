import casual from 'casual';

export const sayHello = () => {
    return {
        name: casual.name,
        age: casual.integer(10, 100)
    };
}

export const resolveDid = () => {
    return {
        name: casual.name,
        age: casual.integer(10, 100)
    };
}


export default {
    sayHello,
    resolveDid
};