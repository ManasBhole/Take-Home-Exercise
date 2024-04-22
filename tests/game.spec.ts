import { test, expect, chromium, Browser, BrowserContext, Page, Locator } from '@playwright/test';

test.describe('Gold Coin Challenge Tests', async () => {
    let myBrowser: Browser;
    let myContext: BrowserContext;
    let myPage: Page;
    let scaleContainers: Locator[];
    let coinArray: number[] = [0,1,2,3,4,5,6,7,8];
    let recordedWeights: string[] = [];
    let suspectCoin: Locator;
    let popupMessage: string;

    async function retrieveWeighingOutcome(weighingIndex: number): Promise<string> {
        const outcomeLocator: Locator = myPage.locator(`ol li:nth-child(${weighingIndex})`);
        return await outcomeLocator.textContent() as string;
    }

    test.beforeAll(async () => {
        myBrowser = await chromium.launch();
        myContext = await myBrowser.newContext();
        myPage = await myContext.newPage();
    });

    test.afterAll(async () => {
        await myPage.close();
        await myContext.close();
        await myBrowser.close();
    });

    test('Load Challenge Page', async () => {
        await myPage.goto('http://sdetchallenge.fetch.com/');
        expect(await myPage.title()).toEqual('React App');

        scaleContainers = await myPage.locator('.game-board').all();
        expect(scaleContainers).toHaveLength(2);
        await expect(scaleContainers[0]).toHaveText('left bowl');
        await expect(scaleContainers[1]).toHaveText('right bowl');
    });

    test('First Weighing - Group Comparison', async () => {
        for (let i = 0; i < 3; i++) {
            await myPage.getByTestId(`left_${i}`).fill(`${coinArray[i]}`);
            await myPage.getByTestId(`right_${i}`).fill(`${coinArray[i + 3]}`);
        }
        await myPage.getByTestId('weigh').click();
        const comparisonResult = await myPage.locator('.result > button');
        const weighingDetails = await retrieveWeighingOutcome(1);
        await expect(comparisonResult).not.toHaveText('?');
        const balanceResult = await comparisonResult.textContent() as string;
        await expect(weighingDetails).toContain(balanceResult);
        recordedWeights.push(weighingDetails);
        await expect(recordedWeights).toHaveLength(1);
        if (balanceResult === '=') {
            coinArray = coinArray.slice(6);
        } else if (balanceResult === '<') {
            coinArray = coinArray.slice(0, 3);
        } else {
            coinArray = coinArray.slice(3, 6);
        }
    });

    test('Second Weighing - Narrowing Down', async () => {
        await myPage.getByText('Reset').click();
        await myPage.getByTestId('left_0').fill(`${coinArray[0]}`);
        await myPage.getByTestId('right_0').fill(`${coinArray[1]}`);
        await myPage.getByTestId('weigh').click();
        const secondResult = await myPage.locator('.result > button');
        const detailsFromSecondWeighing = await retrieveWeighingOutcome(2);
        await expect(secondResult).not.toHaveText('?');
        const outcome = await secondResult.textContent() as string;
        await expect(detailsFromSecondWeighing).toContain(outcome);
        recordedWeights.push(detailsFromSecondWeighing);
        await expect(recordedWeights).toHaveLength(2);
        if (outcome === '=') {
            suspectCoin = myPage.getByTestId(`coin_${coinArray[2]}`);
        } else if (outcome === '<') {
            suspectCoin = myPage.getByTestId(`coin_${coinArray[0]}`);
        } else {
            suspectCoin = myPage.getByTestId(`coin_${coinArray[1]}`);
        }
    });

    test('Final Test - Identify the Fake Coin', async () => {
        myPage.on('dialog', async (dialog) => {
            popupMessage = await dialog.message();
            await dialog.accept();
        });
        if (suspectCoin) {
            await suspectCoin.click();
            await expect(popupMessage).toEqual('Yay! You find it!');
            console.log('Recorded Weighings:');
            recordedWeights.forEach(weight => console.log(weight));
            console.log(`Identified Fake Coin: ${await suspectCoin.textContent()}`);
            console.log(`Completion Message: ${popupMessage}`);
        } else {
            console.error('No suspect coin was identified.');
            throw new Error('No suspect coin was identified.');
        }
    });
    
});
