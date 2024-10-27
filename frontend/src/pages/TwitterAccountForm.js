import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getTwitterAccounts, addTwitterAccount, updateTwitterAccount, deleteTwitterAccount } from '../api/twitter';

const TwitterAccountForm = () => {
    const { authToken } = useContext(AuthContext);
    const [accounts, setAccounts] = useState([]);
    const [newAccount, setNewAccount] = useState({ twitter_token: '', sandbox_login: '', sandbox_password: '' });
    const [editAccountId, setEditAccountId] = useState(null);

    useEffect(() => {
        // Получаем список аккаунтов при монтировании компонента
        const fetchAccounts = async () => {
            try {
                const data = await getTwitterAccounts(authToken);
                setAccounts(data);
            } catch (error) {
                console.error('Ошибка при загрузке аккаунтов:', error);
            }
        };

        fetchAccounts();
    }, [authToken]);

    const handleChange = (e) => {
        setNewAccount({ ...newAccount, [e.target.name]: e.target.value });
    };

    const handleAddAccount = async () => {
        try {
            const account = await addTwitterAccount(authToken, newAccount);
            setAccounts([...accounts, account]);
            setNewAccount({ twitter_token: '', sandbox_login: '', sandbox_password: '' });
        } catch (error) {
            console.error('Ошибка при добавлении аккаунта:', error);
        }
    };

    const handleEditAccount = (account) => {
        setNewAccount(account);
        setEditAccountId(account.id);
    };

    const handleUpdateAccount = async () => {
        try {
            const updatedAccount = await updateTwitterAccount(authToken, editAccountId, newAccount);
            setAccounts(accounts.map(acc => (acc.id === editAccountId ? updatedAccount : acc)));
            setNewAccount({ twitter_token: '', sandbox_login: '', sandbox_password: '' });
            setEditAccountId(null);
        } catch (error) {
            console.error('Ошибка при обновлении аккаунта:', error);
        }
    };

    const handleDeleteAccount = async (id) => {
        try {
            await deleteTwitterAccount(authToken, id);
            setAccounts(accounts.filter(account => account.id !== id));
        } catch (error) {
            console.error('Ошибка при удалении аккаунта:', error);
        }
    };

    return (
        <div>
            <h2>Управление Twitter аккаунтами</h2>

            <div>
                <input
                    type="text"
                    name="twitter_token"
                    placeholder="Токен Twitter"
                    value={newAccount.twitter_token}
                    onChange={handleChange}
                />
                <input
                    type="text"
                    name="sandbox_login"
                    placeholder="Логин Sandbox"
                    value={newAccount.sandbox_login}
                    onChange={handleChange}
                />
                <input
                    type="password"
                    name="sandbox_password"
                    placeholder="Пароль Sandbox"
                    value={newAccount.sandbox_password}
                    onChange={handleChange}
                />

                {editAccountId ? (
                    <button onClick={handleUpdateAccount}>Обновить аккаунт</button>
                ) : (
                    <button onClick={handleAddAccount}>Добавить аккаунт</button>
                )}
            </div>

            <div>
                <h3>Список аккаунтов</h3>
                {accounts.map((account) => (
                    <div key={account.id}>
                        <p>Токен: {account.twitter_token}</p>
                        <p>Логин Sandbox: {account.sandbox_login}</p>
                        <button onClick={() => handleEditAccount(account)}>Редактировать</button>
                        <button onClick={() => handleDeleteAccount(account.id)}>Удалить</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TwitterAccountForm;
